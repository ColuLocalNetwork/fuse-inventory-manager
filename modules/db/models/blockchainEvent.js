const timestamps = require('mongoose-time')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const BlockchainEventSchema = new Schema({
    address: {type: String},
    blockHash: {type: String},
    blockNumber: {type: Number},
    transactionHash: {type: String},
    transactionIndex: {type: Number},
    logIndex: {type: Number},
    removed: {type: String},
    returnValues: {type: db.mongoose.Schema.Types.Mixed},
    raw: {type: db.mongoose.Schema.Types.Mixed},
    event: {type: String, enum: ['Transfer']},
    signature: {type: String}
  }).plugin(timestamps())

  BlockchainEventSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        address: ret.address,
        blockHash: ret.blockHash,
        blockNumber: ret.blockNumber,
        transactionHash: ret.transactionHash,
        transactionIndex: ret.transactionIndex,
        logIndex: ret.logIndex,
        removed: ret.removed,
        returnValues: ret.returnValues,
        raw: ret.raw,
        event: ret.event,
        signature: ret.signature
      }
      return safeRet
    }
  })

  const BlockchainEvent = db.model('Blockchain_Event', BlockchainEventSchema)

  function blockchainEvent () {}

  blockchainEvent.create = (data) => {
    return new Promise((resolve, reject) => {
      if (data.address) data.address = data.address.toLowerCase()
      const blockchainEvent = new BlockchainEvent(data)
      blockchainEvent.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('BlockchainEvent not saved'))
        }
        resolve(newObj)
      })
    })
  }

  blockchainEvent.getLastBlock = (address) => {
    return new Promise((resolve, reject) => {
      const cond = {address: address.toLowerCase()}
      const projection = {blockNumber: 1}
      const limit = 1
      const sort = {blockNumber: -1}

      BlockchainEvent.find(cond, projection)
        .lean()
        .limit(limit)
        .sort(sort)
        .exec((err, data) => {
          if (err) {
            reject(err)
          }
          if (!data || data.length === 0) {
            return resolve(0)
          }
          resolve(data[0].blockNumber)
        })
    })
  }

  blockchainEvent.getModel = () => {
    return BlockchainEvent
  }

  return blockchainEvent
}
