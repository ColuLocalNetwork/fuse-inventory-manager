const timestamps = require('mongoose-time')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const CurrencyBlockchainInfoSchema = new Schema({
    blockHash: {type: String},
    blockNumber: {type: Number},
    transactionHash: {type: String}
  })

  const CurrencySchema = new Schema({
    ccAddress: {type: String, required: true},
    mmAddress: {type: String, required: true},
    ccABI: {type: String, required: true},
    mmABI: {type: String, required: true},
    exid: {type: String},
    ccBlockchainInfo: {type: CurrencyBlockchainInfoSchema}
  }).plugin(timestamps())

  CurrencySchema.index({ccAddress: 1}, {unique: true})
  CurrencySchema.index({mmAddress: 1}, {unique: true})

  CurrencyBlockchainInfoSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
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
        ccAddress: ret.ccAddress,
        mmAddress: ret.mmAddress,
        ccABI: ret.ccABI,
        mmABI: ret.mmABI,
        exid: ret.exid,
        ccBlockchainInfo: ret.ccBlockchainInfo
      }
      return safeRet
    }
  })

  const Currency = db.model('Currency', CurrencySchema)

  function currency () {}

  currency.create = (data) => {
    return new Promise((resolve, reject) => {
      data.ccAddress = data.ccAddress.toLowerCase()
      data.mmAddress = data.mmAddress.toLowerCase()
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

  currency.getByCurrencyAddress = (address) => {
    return new Promise((resolve, reject) => {
      Currency.findOne({ccAddress: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Currency not found for ccAddress: ${address}`))
        }
        resolve(doc)
      })
    })
  }

  currency.getByMarketMakerAddress = (address) => {
    return new Promise((resolve, reject) => {
      Currency.findOne({mmAddress: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Currency not found for mmAddress: ${address}`))
        }
        resolve(doc)
      })
    })
  }

  currency.getAll = () => {
    return new Promise((resolve, reject) => {
      Currency.find({}, (err, docs) => {
        if (err) {
          return reject(err)
        }
        if (!docs || docs.length === 0) {
          return reject(new Error(`No currencies found`))
        }
        resolve(docs)
      })
    })
  }

  currency.getModel = () => {
    return Currency
  }

  return currency
}
