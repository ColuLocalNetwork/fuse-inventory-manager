const timestamps = require('mongoose-time')
const BigNumber = require('bignumber.js')

module.exports = (db) => {
  const setDecimal128 = (bignum) => {
    return db.mongoose.Types.Decimal128.fromString(bignum.toString())
  }

  const getDecimal128 = (decimal) => {
    const val = decimal ? decimal.toString() : 0
    return new BigNumber(val)
  }

  const BlockchainTransactionSchema = new db.mongoose.Schema({
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
    transmittedAt: {type: Date},
    state: {type: String, enum: ['NEW', 'PENDING', 'CONFIRMED', 'FINALIZED'], default: 'NEW'} // TODO are those the states we need ?!?!
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
        transmittedAt: ret.transmittedAt,
        state: ret.state
      }
      return safeRet
    }
  })

  const BlockchainTransaction = db.model('blockchain_transaction', BlockchainTransactionSchema)

  function blockchainTransaction () {}

  blockchainTransaction.create = (data) => {
    return new Promise((resolve, reject) => {
      const blockchainTransaction = new BlockchainTransaction(data)
      blockchainTransaction.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          let err = 'BlockchainTransaction not saved'
          return reject(err)
        }
        resolve(newObj)
      })
    })
  }

  blockchainTransaction.getLastNonceForAddress = (address) => {
    return new Promise((resolve, reject) => {
      const cond = {from: address, $or: [{state: 'FINALIZED'}, {state: 'CONFIRMED'}]}
      const projection = {nonce: 1}
      const limit = 1
      const sort = {blockNumber: -1}

      BlockchainTransaction.find(cond, projection)
        .lean()
        .limit(limit)
        .sort(sort)
        .exec((err, data) => {
          if (err) {
            return reject(err)
          }
          resolve(data && data.length > 0 ? data[0].nonce : 0) // TODO what if no data here ?!?!
        })
    })
  }

  blockchainTransaction.getModel = () => {
    return BlockchainTransaction
  }

  return blockchainTransaction
}
