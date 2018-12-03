const timestamps = require('mongoose-time')
const pagination = require('mongoose-paginate')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const CurrencyBlockchainInfoSchema = new Schema({
    blockHash: {type: String},
    blockNumber: {type: Number},
    transactionHash: {type: String}
  })

  const CurrencySchema = new Schema({
    address: {type: String, required: true},
    abi: {type: String, required: true},
    exid: {type: String},
    blockchainInfo: {type: CurrencyBlockchainInfoSchema}
  }).plugin(timestamps()).plugin(pagination)

  CurrencySchema.index({address: 1}, {unique: true})

  CurrencyBlockchainInfoSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        // id: ret._id.toString(),
        blockHash: ret.blockHash,
        blockNumber: ret.blockNumber,
        transactionHash: ret.transactionHash
      }
      return safeRet
    }
  })

  CurrencySchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        address: ret.address,
        abi: ret.abi,
        exid: ret.exid,
        blockchainInfo: ret.blockchainInfo
      }
      return safeRet
    }
  })

  const Currency = db.model('Currency', CurrencySchema)

  function currency () {}

  currency.create = (data) => {
    return new Promise((resolve, reject) => {
      data.address = data.address.toLowerCase()
      const currency = new Currency(data)
      currency.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('Currency not saved'))
        }
        resolve(newObj)
      })
    })
  }

  currency.update = (condition, update) => {
    return new Promise((resolve, reject) => {
      if (condition.address) condition.address = condition.address.toLowerCase()
      if (update.address) update.address = update.address.toLowerCase()
      Currency.findOneAndUpdate(condition, {$set: update}, {new: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        if (!updatedObj) {
          return reject(new Error(`Currency not found for condition: ${JSON.stringify(condition)}`))
        }
        resolve(updatedObj)
      })
    })
  }

  currency.getById = (id) => {
    return new Promise((resolve, reject) => {
      Currency.findById(id, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Currency not found for id ${id}`))
        }
        resolve(doc)
      })
    })
  }

  currency.getByAddress = (address) => {
    return new Promise((resolve, reject) => {
      Currency.findOne({address: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Currency not found for address: ${address}`))
        }
        resolve(doc)
      })
    })
  }

  currency.getAll = (opts) => {
    return new Promise((resolve, reject) => {
      Currency.paginate({}, opts, (err, docs) => {
        if (err) {
          return reject(err)
        }
        docs = docs || []
        resolve(docs)
      })
    })
  }

  currency.getModel = () => {
    return Currency
  }

  return currency
}
