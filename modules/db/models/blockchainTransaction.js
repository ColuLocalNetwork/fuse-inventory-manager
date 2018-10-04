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

  const BlockchainTransactionSchema = new Schema({
    blockHash: {type: String},
    blockNumber: {type: Number},
    from: {type: String},
    gas: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    gasPrice: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    hash: {type: String, unique: true},
    input: {type: String},
    nonce: {type: Number},
    to: {type: String},
    transactionIndex: {type: Number},
    value: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    type: {type: String, enum: ['TRANSFER', 'CHANGE', 'DEPOSIT']},
    meta: {type: db.mongoose.Schema.Types.Mixed},
    state: {type: String, enum: ['TRANSMITTED', 'CONFIRMED', 'FINALIZED'], default: 'TRANSMITTED'},
    known: {type: Boolean, default: true}
  }).plugin(timestamps())

  BlockchainTransactionSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        blockHash: ret.blockHash,
        blockNumber: ret.blockNumber,
        from: ret.from,
        gas: ret.gas,
        gasPrice: ret.gasPrice,
        hash: ret.hash,
        input: ret.input,
        nonce: ret.nonce,
        to: ret.to,
        transactionIndex: ret.transactionIndex,
        value: ret.value,
        type: ret.type,
        meta: ret.meta,
        state: ret.state,
        known: ret.known
      }
      return safeRet
    }
  })

  const BlockchainTransaction = db.model('Blockchain_Transaction', BlockchainTransactionSchema)

  function blockchainTransaction () {}

  blockchainTransaction.create = (data) => {
    return new Promise((resolve, reject) => {
      if (data.address) data.address = data.address.toLowerCase()
      const blockchainTransaction = new BlockchainTransaction(data)
      blockchainTransaction.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('BlockchainTransaction not saved'))
        }
        resolve(newObj)
      })
    })
  }

  blockchainTransaction.update = (condition, update) => {
    return new Promise((resolve, reject) => {
      if (update.$set.gas) update.$set.gas = setDecimal128(update.$set.gas)
      if (update.$set.gasPrice) update.$set.gasPrice = setDecimal128(update.$set.gasPrice)
      if (update.$set.value) update.$set.value = setDecimal128(update.$set.value)
      BlockchainTransaction.findOneAndUpdate(condition, update, {upsert: true, new: true, setDefaultsOnInsert: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        resolve(updatedObj)
      })
    })
  }

  blockchainTransaction.getById = (id) => {
    return new Promise((resolve, reject) => {
      BlockchainTransaction.findById(id, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`BlockchainTransaction not found for id ${id}`))
        }
        resolve(doc)
      })
    })
  }

  blockchainTransaction.get = (filters, projection, limit, sort) => {
    return new Promise((resolve, reject) => {
      const query = {}
      const conditions = []

      if (filters) {
        if (filters.address) conditions.push({$or: [{from: filters.address.toLowerCase()}, {to: filters.address.toLowerCase()}]})
        if (filters.hash) conditions.push({hash: filters.hash})
        if (filters.type) conditions.push({type: filters.type})
        if (filters.state) conditions.push({state: filters.state})
        if (typeof filters.known !== 'undefined') conditions.push({known: filters.known})
      }
      if (conditions.length > 0) query.$and = conditions

      projection = projection || {}
      limit = limit || 100
      sort = sort || {created_at: 1}

      BlockchainTransaction.find(query, projection)
        .lean()
        .limit(limit)
        .sort(sort)
        .exec((err, docs) => {
          if (err) {
            return reject(err)
          }
          docs = docs || []
          resolve(docs)
        })
    })
  }

  blockchainTransaction.getLastNonceForAddress = (address) => {
    return new Promise((resolve, reject) => {
      const cond = {from: address.toLowerCase()}
      const projection = {nonce: 1}
      const limit = 1
      const sort = {blockNumber: -1}

      BlockchainTransaction.find(cond, projection)
        .lean()
        .limit(limit)
        .sort(sort)
        .exec((err, docs) => {
          if (err) {
            return reject(err)
          }
          resolve(docs && docs.length ? docs[0].nonce : 0)
        })
    })
  }

  blockchainTransaction.getModel = () => {
    return BlockchainTransaction
  }

  return blockchainTransaction
}
