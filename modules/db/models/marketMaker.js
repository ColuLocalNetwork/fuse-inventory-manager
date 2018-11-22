const timestamps = require('mongoose-time')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const MarketMakerSchema = new Schema({
    address: {type: String, required: true},
    tokenAddress1: {type: String, required: true},
    tokenAddress2: {type: String, required: true},
    abi: {type: String, required: true}
  }).plugin(timestamps())

  MarketMakerSchema.index({address: 1}, {unique: true})
  MarketMakerSchema.index({tokenAddress1: 1, tokenAddress2: 1}, {unique: true})
  MarketMakerSchema.index({address: 1, tokenAddress1: 1, tokenAddress2: 1}, {unique: true})

  MarketMakerSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        address: ret.address,
        tokenAddress1: ret.tokenAddress1,
        tokenAddress2: ret.tokenAddress2
      }
      return safeRet
    }
  })

  const MarketMaker = db.model('Market_Maker', MarketMakerSchema)

  function marketMaker () {}

  marketMaker.create = (data) => {
    return new Promise((resolve, reject) => {
      ['address', 'tokenAddress1', 'tokenAddress2'].forEach(k => {
        data[k] = data[k].toLowerCase()
      })
      const mm = new MarketMaker(data)
      mm.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('MarketMaker not saved'))
        }
        resolve(newObj)
      })
    })
  }

  marketMaker.update = (condition, update) => {
    return new Promise((resolve, reject) => {
      ['address', 'tokenAddress1', 'tokenAddress2'].forEach(k => {
        if (condition[k]) condition[k] = condition[k].toLowerCase()
        if (update[k]) update[k] = update[k].toLowerCase()
      })

      MarketMaker.findOneAndUpdate(condition, {$set: update}, {new: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        if (!updatedObj) {
          return reject(new Error(`MarketMaker not found for condition: ${JSON.stringify(condition)}`))
        }
        resolve(updatedObj)
      })
    })
  }

  marketMaker.getById = (id) => {
    return new Promise((resolve, reject) => {
      MarketMaker.findById(id, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`MarketMaker not found for id ${id}`))
        }
        resolve(doc)
      })
    })
  }

  marketMaker.getByAddress = (address) => {
    return new Promise((resolve, reject) => {
      MarketMaker.findOne({address: address.toLowerCase()}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`MarketMaker not found for address: ${address}`))
        }
        resolve(doc)
      })
    })
  }

  marketMaker.getByPair = (tokenAddress1, tokenAddress2) => {
    return new Promise((resolve, reject) => {
      const condition = {$or: [
        {tokenAddress1: tokenAddress1.toLowerCase(), tokenAddress2: tokenAddress2.toLowerCase()},
        {tokenAddress1: tokenAddress2.toLowerCase(), tokenAddress2: tokenAddress1.toLowerCase()}
      ]}
      MarketMaker.findOne(condition, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`MarketMaker not found for pair: ${tokenAddress1} and ${tokenAddress2}`))
        }
        resolve(doc)
      })
    })
  }

  marketMaker.getModel = () => {
    return MarketMaker
  }

  return marketMaker
}
