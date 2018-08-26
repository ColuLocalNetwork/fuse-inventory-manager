const timestamps = require('mongoose-time')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const CommunitySchema = new Schema({
    name: {type: String},
    wallets: [{type: Schema.Types.ObjectId, ref: 'Wallet'}],
    mnemonic: {type: String},
    defaultCurrency: {type: Schema.Types.ObjectId, ref: 'Currency'}
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
        // mnemonic: ret.mnemonic,
        defaultCurrency: ret.defaultCurrency
      }
      return safeRet
    }
  })

  const Community = db.model('Community', CommunitySchema)

  function community () {}

  community.create = (data) => {
    return new Promise((resolve, reject) => {
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
        resolve(updatedObj)
      })
    })
  }

  community.getById = (id) => {
    return new Promise((resolve, reject) => {
      Community.findById(id, (err, doc) => {
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
      const wallet = await osseus.db_models.wallet.getByAddress(address).catch(err => { reject(err) })
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
  }

  community.getAll = () => {
    return new Promise((resolve, reject) => {
      Community.find({}).populate('wallets').exec((err, docs) => {
        if (err) {
          return reject(err)
        }
        if (!docs || docs.length === 0) {
          return reject(new Error(`No communities found`))
        }
        resolve(docs)
      })
    })
  }

  community.getModel = () => {
    return Community
  }

  return community
}
