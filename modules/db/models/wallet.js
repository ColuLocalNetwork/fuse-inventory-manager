const timestamps = require('mongoose-time')
const BigNumber = require('bignumber.js')

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

  const BalanceSchema = new Schema({
    currency: {type: Schema.Types.ObjectId, ref: 'Currency'},
    blockchainAmount: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    offchainAmount: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    pendingTxs: [{type: String}]
  }).plugin(timestamps())

  const WalletSchema = new Schema({
    type: {type: String, required: true},
    address: {type: String, required: true},
    index: {type: Number},
    exid: {type: String},
    balances: [{type: BalanceSchema}]
  }).plugin(timestamps())

  WalletSchema.index({address: 1}, {unique: true})

  BalanceSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        currency: ret.currency,
        blockchainAmount: ret.blockchainAmount,
        offchainAmount: ret.offchainAmount,
        pendingTxs: ret.pendingTxs
      }
      return safeRet
    }
  })

  WalletSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        type: ret.type,
        address: ret.address,
        index: ret.index,
        exid: ret.exid,
        balances: ret.balances
      }
      return safeRet
    }
  })

  const Wallet = db.model('Wallet', WalletSchema)

  function wallet () {}

  wallet.create = (data) => {
    return new Promise((resolve, reject) => {
      data.address = data.address.toLowerCase()
      const wallet = new Wallet(data)
      wallet.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('Wallet not saved'))
        }
        resolve(newObj)
      })
    })
  }

  wallet.update = (condition, update) => {
    return new Promise((resolve, reject) => {
      if (update.address) update.address = update.address.toLowerCase()
      Wallet.findOneAndUpdate(condition, {$set: update}, {new: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        resolve(updatedObj)
      })
    })
  }

  wallet.updateBlockchainBalance = (condition, amount) => {
    return new Promise((resolve, reject) => {
      Wallet.findOneAndUpdate(condition, {$set: {'balances.$.blockchainAmount': amount}}, {new: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        resolve(updatedObj)
      })
    })
  }

  wallet.getById = (id) => {
    return new Promise((resolve, reject) => {
      Wallet.findById(id, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Wallet not found for id ${id}`))
        }
        resolve(doc)
      })
    })
  }

  wallet.getByAddress = (address) => {
    return new Promise((resolve, reject) => {
      Wallet.findOne({address: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Wallet not found for address: ${address}`))
        }
        resolve(doc)
      })
    })
  }

  wallet.checkAddressExists = (address) => {
    return new Promise((resolve, reject) => {
      Wallet.findOne({address: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return resolve(false)
        }
        if (!doc) {
          return resolve(false)
        }
        resolve(true)
      })
    })
  }

  wallet.getBlockchainBalance = (address, currencyId) => {
    return new Promise((resolve, reject) => {
      Wallet.findOne({address: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Wallet not found for address: ${address}`))
        }
        const balance = doc.balances && doc.balances.filter(balance => balance.currency.toString() === currencyId)[0]
        if (!balance || !balance.blockchainAmount) {
          return reject(new Error(`Wallet could not get balance - address: ${address}, currencyId: ${currencyId}`))
        }
        resolve(balance.blockchainAmount.toNumber())
      })
    })
  }

  wallet.getAll = (query, projection) => {
    return new Promise((resolve, reject) => {
      Wallet.find(query, projection)
        .lean()
        .populate('balances.currency')
        .exec((err, docs) => {
          if (err) {
            return reject(err)
          }
          if (!docs || docs.length === 0) {
            return reject(new Error(`No wallets found`))
          }
          resolve(docs)
        })
    })
  }

  wallet.aggregateBalancesPerCurrency = (currency) => {
    return new Promise((resolve, reject) => {
      const condition = currency ? {'balances.currency': db.mongoose.Types.ObjectId(currency)} : {}
      Wallet.aggregate([
        {
          $unwind: '$balances'
        },
        {
          $match: condition
        },
        {
          $project: {
            currency: '$balances.currency',
            blockchainAmount: '$balances.blockchainAmount',
            offchainAmount: '$balances.offchainAmount'
          }
        },
        {
          $group: {
            _id: {
              currency: '$currency'
            },
            totalBlockchainAmount: {$sum: '$blockchainAmount'},
            totalOffchainAmount: {$sum: '$offchainAmount'}
          }
        }
      ], (err, results) => {
        if (err) {
          return reject(err)
        }
        if (!results || results.length === 0) {
          return reject(new Error(`No aggregation found`))
        }
        results = results.map(result => {
          return {
            currency: result._id.currency.toString(),
            totalBlockchainAmount: getDecimal128(result.totalBlockchainAmount),
            totalOffchainAmount: getDecimal128(result.totalOffchainAmount)
          }
        })
        resolve(results)
      })
    })
  }

  wallet.getModel = () => {
    return Wallet
  }

  return wallet
}
