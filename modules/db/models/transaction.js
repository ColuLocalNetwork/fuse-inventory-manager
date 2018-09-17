const timestamps = require('mongoose-time')
const BigNumber = require('bignumber.js')
const async = require('async')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const setDecimal128 = (bignum) => {
    return db.mongoose.Types.Decimal128.fromString(bignum.toString())
  }

  const getDecimal128 = (decimal) => {
    const val = decimal ? decimal.toString() : 0
    return new BigNumber(val)
  }

  const ParticipantSchema = new Schema({
    accountAddress: {type: String},
    currency: {type: Schema.Types.ObjectId, ref: 'Currency'}
  }).plugin(timestamps())

  const TransactionSchema = new Schema({
    from: {type: ParticipantSchema},
    to: {type: ParticipantSchema},
    amount: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    transmit: {type: Schema.Types.ObjectId, ref: 'Transmit'},
    context: {type: String, enum: ['transfer', 'change', 'deposit', 'other'], default: 'other'},
    state: {type: String, enum: ['NEW', 'PENDING', 'DONE', 'CANCELED', 'TRANSMITTED'], default: 'NEW'}
  }).plugin(timestamps())

  ParticipantSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        accountAddress: ret.accountAddress,
        currency: ret.currency
      }
      return safeRet
    }
  })

  TransactionSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        from: ret.from,
        to: ret.to,
        amount: ret.amount,
        transmit: ret.transmit,
        context: ret.context,
        state: ret.state
      }
      return safeRet
    }
  })

  const Transaction = db.model('Transaction', TransactionSchema)

  function transaction () {}

  const createNewTransaction = (tx) => {
    return new Promise(async (resolve, reject) => {
      // console.log(`createNewTransaction: ${JSON.stringify(tx)}`)
      const transaction = new Transaction(tx)
      transaction.save((err, newTx) => {
        if (err) {
          return reject(err)
        }
        if (!newTx) {
          return reject(new Error('Transaction not saved'))
        }
        resolve(newTx)
      })
    })
  }

  const updateTransactionState = (tx, originalState, newState) => {
    return new Promise((resolve, reject) => {
      const condition = {_id: tx._id, state: originalState}
      const update = {$set: {state: newState}}
      const opts = {new: true}
      Transaction.findOneAndUpdate(condition, update, opts, (err, updatedTx) => {
        if (err) {
          return reject(err)
        }
        resolve(updatedTx)
      })
    })
  }

  const processNewTransaction = (tx, currencyId) => {
    const bulk = osseus.db_models.wallet.getModel().collection.initializeOrderedBulkOp()

    const addNewBalance = (participant) => {
      const condition = {
        'address': participant.accountAddress,
        'balances': {
          '$not': {
            '$elemMatch': {
              'currency': participant.currency
            }
          }
        }
      }
      const update = {
        '$push': {
          'balances': {
            'currency': participant.currency,
            'offchainAmount': 0,
            'blockchainAmount': 0,
            'pendingTxs': []
          }
        }
      }
      // console.log(`addNewBalance: ${JSON.stringify(condition)}, ${JSON.stringify(update)}`)
      bulk.find(condition).updateOne(update)
    }

    const addPendingTxs = (participant) => {
      addNewBalance(participant)
      const condition = {
        'address': participant.accountAddress,
        'balances': {
          '$elemMatch': {
            'currency': participant.currency,
            'pendingTxs': {
              '$ne': tx._id.toString()
            }
          }
        }
      }
      const update = {
        '$push': {
          'balances.$.pendingTxs': tx._id.toString()
        }
      }
      // console.log(`addPendingTxs: ${JSON.stringify(condition)}, ${JSON.stringify(update)}`)
      bulk.find(condition).updateOne(update)
    }

    return new Promise((resolve, reject) => {
      // console.log(`processNewTransaction: ${JSON.stringify(tx)}`)
      if (!tx) {
        return reject(new Error(`transaction undefined in processNewTransaction`))
      }
      if (tx.state !== 'NEW') {
        return reject(new Error(`Illegal state for processNewTransaction - should be NEW`))
      }
      async.waterfall([
        (cb) => {
          addPendingTxs(tx.from)
          addPendingTxs(tx.to)
          bulk.execute(cb)
        },
        async.asyncify(res => {
          return updateTransactionState(tx, 'NEW', 'PENDING')
        })
      ], (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result)
      })
    })
  }

  const processPendingTransaction = (tx) => {
    const Wallet = osseus.db_models.wallet.getModel()

    const updateParticipant = (participantEnd) => {
      return new Promise(async (resolve, reject) => {
        const participant = tx[participantEnd]
        const condition = {
          'address': participant.accountAddress,
          'balances.currency': participant.currency,
          'balances.pendingTxs': tx._id.toString()
        }
        if (participantEnd === 'from') {
          condition['balances.offchainAmount'] = {'$gte': tx.amount}
        }
        const amount = new BigNumber(tx.amount).multipliedBy(participantEnd === 'from' ? -1 : 1)
        const update = {
          '$inc': {
            'balances.$.offchainAmount': amount
          },
          '$pull': {
            'balances.$.pendingTxs': tx._id.toString()
          }
        }
        const opts = {
          upsert: false,
          multi: false
        }
        // console.log(`processPendingTransaction --> updateParticipant ${participantEnd}: ${JSON.stringify(condition)}`)
        Wallet.update(condition, update, opts).exec((err, raw) => {
          if (err) {
            return reject(err)
          }
          resolve(!!raw.nModified)
        })
      })
    }

    return new Promise(async (resolve, reject) => {
      // console.log(`processPendingTransaction: ${JSON.stringify(tx)}`)
      if (!tx) {
        return reject(new Error(`transaction undefined in processPendingTransaction`))
      }
      if (tx.state !== 'PENDING') {
        return reject(new Error(`Illegal state for processPendingTransaction - should be PENDING`))
      }
      try {
        let result
        let modified = await updateParticipant('from')
        if (modified) {
          await updateParticipant('to')
          result = await updateTransactionState(tx, 'PENDING', 'DONE')
        } else {
          result = await cancelTransaction(tx)
        }
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  }

  const cancelTransaction = (tx) => {
    const Wallet = osseus.db_models.wallet.getModel()

    const updateParticipant = (participantEnd) => {
      return new Promise(async (resolve, reject) => {
        const participant = tx[participantEnd]
        const condition = {
          'address': participant.accountAddress,
          'balances.currency': participant.currency,
          'balances.pendingTxs': tx._id.toString()
        }
        const update = {
          '$pull': {
            'balances.$.pendingTxs': tx._id.toString()
          }
        }
        const opts = {
          upsert: false,
          multi: false
        }
        // console.log(`cancelTransaction --> updateParticipant ${participantEnd}: ${JSON.stringify(condition), ${JSON.stringify(update)}}`)
        Wallet.update(condition, update, opts).exec((err, raw) => {
          if (err) {
            return reject(err)
          }
          resolve(!!raw.nModified)
        })
      })
    }

    return new Promise(async (resolve, reject) => {
      // console.log(`cancelTransaction: ${JSON.stringify(tx)}`)
      if (!tx) {
        return reject(new Error(`transaction undefined in cancelTransaction`))
      }
      if (tx.state !== 'PENDING') {
        return reject(new Error(`Illegal state for cancelTransaction - should be PENDING`))
      }
      try {
        await updateParticipant('from')
        await updateParticipant('to')
        let result = await updateTransactionState(tx, 'PENDING', 'CANCELED')
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.create = (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!data.context) {
          return reject(new Error(`Cannot create a transaction - missing context`))
        }
        let tx = await createNewTransaction(data)
        tx = await processNewTransaction(tx)
        tx = await processPendingTransaction(tx)
        resolve(tx)
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.createDeposit = (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!data.transmit) {
          return reject(new Error(`Cannot create a 'deposit' transaction - missing transmit id`))
        }
        data.state = 'TRANSMITTED'
        let tx = await createNewTransaction(data)

        const Wallet = osseus.db_models.wallet.getModel()
        const condition = {
          'address': tx.to.accountAddress,
          'balances.currency': tx.to.currency
        }
        const amount = new BigNumber(tx.amount)
        const update = {
          '$inc': {
            'balances.$.offchainAmount': amount,
            'balances.$.blockchainAmount': amount
          }
        }
        const opts = {
          upsert: false,
          multi: false
        }
        Wallet.update(condition, update, opts).exec((err, raw) => {
          if (err) {
            return reject(err)
          }
          resolve(tx)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.get = (filters, projection, limit, sort, populate) => {
    const query = {}
    const conditions = []

    if (filters) {
      if (filters.id) conditions.push({_id: filters.id})
      if (filters.address) {
        conditions.push({$or: [{'from.accountAddress': filters.address}, {'to.accountAddress': filters.address}]})
      } else {
        if (filters.fromAddress) conditions.push({'from.accountAddress': filters.fromAddress})
        if (filters.toAddress) conditions.push({'to.accountAddress': filters.toAddress})
      }
      if (filters.context) conditions.push({context: filters.context})
      if (filters.state) conditions.push({state: filters.state})
      if (filters.currency) conditions.push({$or: [{'from.currency': filters.currency}, {'to.currency': filters.currency}]})
    }
    if (conditions.length > 0) query.$and = conditions

    projection = projection || {}
    sort = sort || {created_at: 1}

    return new Promise((resolve, reject) => {
      Transaction.find(query, projection)
        .lean()
        .limit(limit)
        .sort(sort)
        .populate(populate ? 'from.currency to.currency' : '')
        .exec((err, docs) => {
          if (err) {
            return reject(err)
          }
          if (!docs || docs.length === 0) {
            return reject(new Error(`No transactions found`))
          }
          docs = docs.map(doc => {
            doc.amount = getDecimal128(doc.amount)
            return doc
          })
          resolve(docs)
        })
    })
  }

  transaction.markAsTransmitted = (ids, transmitId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {_id: {'$in': ids}, state: 'DONE'} // TODO should be in {state: 'SELECTED'}
        const update = {$set: {state: 'TRANSMITTED', transmit: transmitId}}
        const opts = {upsert: false, multi: true}
        Transaction.update(condition, update, opts, (err, raw) => {
          if (err) {
            return reject(err)
          }
          resolve(raw.nModified)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.getModel = () => {
    return Transaction
  }

  return transaction
}
