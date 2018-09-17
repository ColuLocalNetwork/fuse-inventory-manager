const timestamps = require('mongoose-time')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const TransmitSchema = new Schema({
    offchainTransactions: [{type: Schema.Types.ObjectId, ref: 'Transaction'}],
    blockchainTransactions: [{type: Schema.Types.ObjectId, ref: 'Blockchain_Transaction'}]
  }).plugin(timestamps())

  TransmitSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        offchainTransactions: ret.offchainTransactions,
        blockchainTransactions: ret.blockchainTransactions
      }
      return safeRet
    }
  })

  const Transmit = db.model('Transmit', TransmitSchema)

  function transmit () {}

  transmit.create = (data) => {
    return new Promise((resolve, reject) => {
      const transmit = new Transmit(data)
      transmit.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('Transmit not saved'))
        }
        resolve(newObj)
      })
    })
  }

  transmit.update = (id, data) => {
    return new Promise((resolve, reject) => {
      Transmit.findOneAndUpdate({_id: id}, {$set: data}, {new: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        resolve(updatedObj)
      })
    })
  }

  transmit.getById = (id) => {
    return new Promise((resolve, reject) => {
      Transmit.findById(id, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Transmit not found for id ${id}`))
        }
        resolve(doc)
      })
    })
  }

  transmit.getModel = () => {
    return Transmit
  }

  return transmit
}
