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

  const CommunitySchema = new Schema({
    managerWalletAddress: {type: String},
    usersWalletAddress: {type: String},
    mnemonic: {type: String},
    defaultCurrency: {type: Schema.Types.ObjectId, ref: 'Currency'},
    managerBalance: {type: BalanceSchema},
    usersBalance: {type: BalanceSchema}
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

  CommunitySchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        managerWalletAddress: ret.managerWalletAddress,
        usersWalletAddress: ret.usersWalletAddress,
        // mnemonic: ret.mnemonic,
        defaultCurrency: ret.defaultCurrency,
        managerBalance: ret.managerBalance,
        usersBalance: ret.usersBalance
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

  community.getByManagerWalletAddress = (address) => {
    return new Promise((resolve, reject) => {
      Community.findOne({managerWalletAddress: address}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Community not found for managerWalletAddress: ${address}`
          return reject(err)
        }
        resolve(doc)
      })
    })
  }

  community.getByUsersWalletAddress = (address) => {
    return new Promise((resolve, reject) => {
      Community.findOne({usersWalletAddress: address}, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          err = `Community not found for usersWalletAddress: ${address}`
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
          manager/users
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
          manager/users
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
