const Osseus = require('@colucom/osseus')
const path = require('path')
const util = require('util')
const cwd = process.cwd()
const bip39 = require('bip39')
const HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = async () => {
  let osseus = await Osseus.get()
  osseus.cwd = osseus.cwd || cwd
  osseus.web3 = web3 // this is the global web3 created by truffle...
  osseus.web3.eth.getBlockNumber = util.promisify(osseus.web3.eth.getBlockNumber)
  if (!osseus.utils) require(path.join(cwd, 'modules/utils')).init(osseus)
  osseus.db_models = osseus.db_models || {
    bctx: require(path.join(cwd, 'modules/db/models/blockchainTransaction'))(osseus),
    community: require(path.join(cwd, 'modules/db/models/community'))(osseus),
    currency: require(path.join(cwd, 'modules/db/models/currency'))(osseus),
    marketMaker: require(path.join(cwd, 'modules/db/models/marketMaker'))(osseus),
    transmit: require(path.join(cwd, 'modules/db/models/transmit'))(osseus),
    tx: require(path.join(cwd, 'modules/db/models/transaction'))(osseus),
    wallet: require(path.join(cwd, 'modules/db/models/wallet'))(osseus)
  }
  if (!osseus.agenda) require(path.join(cwd, 'modules/jobs')).init(osseus)
  osseus.lib = osseus.lib || {
    Currency: require(path.join(cwd, 'modules/lib/models/currency'))(osseus),
    Community: require(path.join(cwd, 'modules/lib/models/community'))(osseus),
    MarketMaker: require(path.join(cwd, 'modules/lib/models/marketMaker'))(osseus),
    Transaction: require(path.join(cwd, 'modules/lib/models/transaction'))(osseus),
    BlockchainTransaction: require(path.join(cwd, 'modules/lib/models/blockchainTransaction'))(osseus)
  }
  osseus.helpers = {
    randomNum: (n) => {
      return Math.floor(Math.random() * n)
    },
    randomStr: (n) => {
      return Math.random().toString(36).substr(2, n)
    },
    clearDB: () => {
      Object.keys(osseus.db_models).forEach(model => {
        osseus.db_models[model].getModel().remove({}, () => {})
      })
    }
  }
  osseus.helpers.provider = new HDWalletProvider([{mnemonic: bip39.generateMnemonic(), password: osseus.helpers.randomStr(10)}], osseus.config.web3_provider)

  return osseus
}
