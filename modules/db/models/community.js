const timestamps = require('mongoose-time')
const uuidv4 = require('uuid/v4')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const CommunitySchema = new Schema({
    name: {type: String, required: true},
    wallets: [{type: Schema.Types.ObjectId, ref: 'Wallet'}],
    mnemonic: {type: String, required: true},
    uuid: {type: String},
    defaultCurrency: {type: Schema.Types.ObjectId, ref: 'Currency', required: true},
    exid: {type: String}
  }).plugin(timestamps())

  CommunitySchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        name: ret.name,
        wallets: ret.wallets,
        defaultCurrency: ret.defaultCurrency,
        exid: ret.exid
      }
      if (options.onCreate) {
        safeRet.mnemonic = ret.mnemonic
        safeRet.uuid = ret.uuid
        ret.wallets.map(wallet => {
          delete wallet.balances
        })
      }
      return safeRet
    }
  })

  const Community = db.model('Community', CommunitySchema)

  function community () {}

  community.create = (data) => {
    return new Promise((resolve, reject) => {
      data.uuid = uuidv4()
      const community = new Community(data)
      community.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('Community not saved'))
        }
        resolve(newObj)
      })
    })
  }

  community.update = (id, data) => {
    return new Promise((resolve, reject) => {
      Community.findOneAndUpdate({_id: id}, {$set: data}, {new: true}, (err, updatedObj) => {
        if (err) {
          return reject(err)
        }
        if (!updatedObj) {
          return reject(new Error(`Community not found for id ${id}`))
        }
        resolve(updatedObj)
      })
    })
  }

  community.getById = (id) => {
    return new Promise((resolve, reject) => {
      Community.findById(id).populate('wallets').exec((err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Community not found for id ${id}`))
        }
        resolve(doc)
      })
    })
  }

  community.getByName = (name) => {
    return new Promise((resolve, reject) => {
      Community.findOne({name: name}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Community not found for name ${name}`))
        }
        resolve(doc)
      })
    })
  }

  community.getByWalletAddress = (address) => {
    return new Promise(async (resolve, reject) => {
      await osseus.db_models.wallet.getByAddress(address)
        .then(wallet => {
          Community.findOne({'wallets': wallet._id}, (err, doc) => {
            if (err) {
              return reject(err)
            }
            if (!doc) {
              return reject(new Error(`Community not found for wallet address: ${address}`))
            }
            resolve(doc)
          })
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  community.getAll = () => {
    return new Promise((resolve, reject) => {
      Community.find({}).populate('wallets').exec((err, docs) => {
        if (err) {
          return reject(err)
        }
        docs = docs || []
        resolve(docs)
      })
    })
  }

  community.getModel = () => {
    return Community
  }

  return community
}
