const timestamps = require('mongoose-time')
const BigNumber = require('bignumber.js')

module.exports = (db) => {
  const Schema = db.mongoose.Schema

  const setDecimal128 = (bignum) => {
    return db.mongoose.Types.Decimal128.fromString(bignum.toString())
  }

  const getDecimal128 = (decimal) => {
    const val = decimal ? decimal.toString() : 0
    return new BigNumber(val)
  }

  const BalanceSchema = new Schema({
    currency: {type: Schema.Types.ObjectId, ref: 'Currency'},
    blockchainBalance: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128},
    offchainBalance: {type: db.mongoose.Schema.Types.Decimal128, set: setDecimal128, get: getDecimal128}
  }).plugin(timestamps())

  const WalletSchema = new Schema({
    type: {type: String, enum: ['manager', 'users', 'merchants']},
    address: {type: String},
    index: {type: Number},
    balances: [{type: BalanceSchema}]
  }).plugin(timestamps())

  WalletSchema.index({type: 1}, {unique: true})
  WalletSchema.index({address: 1}, {unique: true})
  WalletSchema.index({index: 1}, {unique: true})

  const CommunitySchema = new Schema({
    wallets: [{type: WalletSchema}],
    mnemonic: {type: String},
    defaultCurrency: {type: Schema.Types.ObjectId, ref: 'Currency'}
  }).plugin(timestamps())

  BalanceSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        currency: ret.currency,
        blockchainBalance: ret.blockchainBalance,
        offchainBalance: ret.offchainBalance
      }
      return safeRet
    }
  })

  WalletSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        type: ret.type,
        address: ret.address,
        index: ret.index,
        balances: ret.balances
      }
      return safeRet
    }
  })

  CommunitySchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        wallets: ret.wallets,
        // mnemonic: ret.mnemonic,
        defaultCurrency: ret.defaultCurrency
      }
      return safeRet
    }
  })

  const Community = db.model('community', CommunitySchema)

  function community () {}

  community.create = (data) => {
    return new Promise((resolve, reject) => {
      const community = new Community(data)
      community.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          let err = 'Community not saved'
          return reject(err)
        }
        resolve(newObj)
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
          err = `Community with not found for id ${id}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  community.getByWalletType = (type) => {
    return new Promise((resolve, reject) => {
      Community.findOne({'wallets.type': type}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Community not found for wallet type: ${type}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  community.getByWalletAddress = (address) => {
    return new Promise((resolve, reject) => {
      Community.findOne({'wallets.address': address}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Community not found for wallet address: ${address}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  community.getByWalletIndex = (index) => {
    return new Promise((resolve, reject) => {
      Community.findOne({'wallets.index': index}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Community not found for wallet index: ${index}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  community.updateBalance = () => {
    return new Promise((resolve, reject) => {
      /* TODO
        Input params:
          manager/users/merchants/etc...
          blockchain/offchain
          currency (id)
          increase/decrease
          amount
      */
      reject(new Error('not implemented yet'))
    })
  }

  community.checkSufficientBalance = () => {
    return new Promise((resolve, reject) => {
      /* TODO
        Input params:
          manager/users/merchants/etc...
          blockchain/offchain
          currency (id)
          amount
      */
      reject(new Error('not implemented yet'))
    })
  }

  community.getModel = () => {
    return Community
  }

  return community
}
