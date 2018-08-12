const timestamps = require('mongoose-time')

module.exports = (db) => {
  const Schema = db.mongoose.Schema

  const CurrencySchema = new Schema({
    ccAddress: {type: String},
    mmAddress: {type: String},
    ccABI: {type: String},
    mmABI: {type: String}
  }).plugin(timestamps())

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
        mmABI: ret.mmABI
      }
      return safeRet
    }
  })

  const Currency = db.model('currency', CurrencySchema)

  function currency () {}

  currency.create = (data) => {
    return new Promise((resolve, reject) => {
      const currency = new Currency(data)
      currency.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          let err = 'Currency not saved'
          return reject(err)
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
          err = `Currency with not found for id ${id}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  currency.getByCurrencyAddress = (address) => {
    return new Promise((resolve, reject) => {
      Currency.findOne({ccAddress: address}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Currency not found for ccAddress: ${address}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  currency.getByMarketMakerAddress = (address) => {
    return new Promise((resolve, reject) => {
      Currency.findOne({mmAddress: address}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Currency not found for mmAddress: ${address}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  currency.getModel = () => {
    return Currency
  }

  return currency
}
