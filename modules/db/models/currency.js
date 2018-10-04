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
    currencyType: {type: String, enum: ['CLN', 'CC'], default: 'CC'},
    currencyAddress: {type: String, required: true},
    marketMakerAddress: {type: String, required: () => { return this.currencyType === 'CC' }},
    currencyABI: {type: String, required: true},
    marketMakerABI: {type: String, required: () => { return this.currencyType === 'CC' }},
    exid: {type: String},
    currencyBlockchainInfo: {type: CurrencyBlockchainInfoSchema}
  }).plugin(timestamps())

  CurrencySchema.index({currencyType: 1, currencyAddress: 1}, {unique: true})
  CurrencySchema.index({currencyAddress: 1}, {unique: true})
  CurrencySchema.index({marketMakerAddress: 1}, {unique: true})

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
        currencyType: ret.currencyType,
        currencyAddress: ret.currencyAddress,
        marketMakerAddress: ret.marketMakerAddress,
        currencyABI: ret.currencyABI,
        marketMakerABI: ret.marketMakerABI,
        exid: ret.exid,
        currencyBlockchainInfo: ret.currencyBlockchainInfo
      }
      return safeRet
    }
  })

  const Currency = db.model('Currency', CurrencySchema)

  function currency () {}

  currency.create = (data) => {
    return new Promise((resolve, reject) => {
      data.currencyAddress = data.currencyAddress.toLowerCase()
      data.marketMakerAddress = data.marketMakerAddress && data.marketMakerAddress.toLowerCase()
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

  currency.getCLN = () => {
    return new Promise((resolve, reject) => {
      Currency.findOne({currencyType: 'CLN'}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Currency CLN not found`))
        }
        resolve(doc)
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
      Currency.findOne({currencyAddress: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Currency not found for currencyAddress: ${address}`))
        }
        resolve(doc)
      })
    })
  }

  currency.getByMarketMakerAddress = (address) => {
    return new Promise((resolve, reject) => {
      Currency.findOne({marketMakerAddress: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Currency not found for marketMakerAddress: ${address}`))
        }
        resolve(doc)
      })
    })
  }

  currency.getAllCCs = () => {
    return new Promise((resolve, reject) => {
      Currency.find({currencyType: 'CC'}, (err, docs) => {
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
