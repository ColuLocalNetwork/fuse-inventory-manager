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
    hash: {type: String},
    input: {type: String},
    nonce: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    to: {type: String},
    transactionIndex: {type: Number},
    value: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
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
          err = {status: 500, message: err}
          return reject(err)
        }
        if (!newObj) {
          err = {status: 500, message: 'BlockchainTransaction not saved'}
          return reject(err)
        }
        resolve(newObj)
      })
    })
  }

  blockchainTransaction.getModel = () => {
    return BlockchainTransaction
  }

  return blockchainTransaction
}
