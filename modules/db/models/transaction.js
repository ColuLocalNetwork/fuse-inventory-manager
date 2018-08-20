const timestamps = require('mongoose-time')
const BigNumber = require('bignumber.js')

module.exports = (db) => {
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
    bctx: {type: Schema.Types.ObjectId, ref: 'BlockchainTransaction'},
    state: {type: String, enum: ['NEW', 'TRANSMITTED', 'CONFIRMED', 'FINALIZED'], default: 'NEW'}
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
        bctx: ret.bctx,
        state: ret.state
      }
      return safeRet
    }
  })

  const Transaction = db.model('transaction', TransactionSchema)

  function transaction () {}

  transaction.create = (data) => {
    return new Promise((resolve, reject) => {
      const transaction = new Transaction(data)
      transaction.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          let err = 'Transaction not saved'
          return reject(err)
        }
        resolve(newObj)
      })
    })
  }

  transaction.update = (id, data) => {
    return new Promise((resolve, reject) => {
      Transaction.findOneAndUpdate({_id: id}, {$set: data}, {new: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        resolve(updatedObj)
      })
    })
  }

  transaction.getById = (id) => {
    return new Promise((resolve, reject) => {
      Transaction.findById(id, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Transaction not found for id ${id}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  transaction.get = (cond) => {
    const query = {}
    const conditions = []

    if (cond.address) {
      conditions.push({$or: [{'from.accountAddress': cond.address}, {'to.accountAddress': cond.address}]})
    }
    if (cond.state) {
      conditions.push({state: cond.state})
    }
    if (cond.currency) {
      conditions.push({$or: [{'from.currency': cond.currency}, {'to.currency': cond.currency}]})
    }
    if (conditions.length > 0) {
      query.$and = conditions
    }

    return new Promise((resolve, reject) => {
      Transaction.find(query, (err, docs) => {
        if (err) {
          return reject(err)
        }
        if (!docs || docs.length === 0) {
          err = `No transactions found`
          return reject(err)
        }
        resolve(docs)
      })
    })
  }

  transaction.getModel = () => {
    return Transaction
  }

  return transaction
}
