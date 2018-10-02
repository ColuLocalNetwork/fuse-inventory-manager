const Osseus = require('@colucom/osseus')
const path = require('path')
const cwd = process.cwd()

module.exports = async () => {
  let osseus = await Osseus.get()
  osseus.cwd = osseus.cwd || cwd
  osseus.web3 = web3 // this is the global web3 created by truffle...
  if (!osseus.utils) require(path.join(cwd, '/modules/utils')).init(osseus)
  osseus.db_models = osseus.db_models || {
    bctx: require(path.join(cwd, 'modules/db/models/blockchainTransaction'))(osseus),
    currency: require(path.join(cwd, 'modules/db/models/currency'))(osseus),
    community: require(path.join(cwd, 'modules/db/models/community'))(osseus),
    transmit: require(path.join(cwd, 'modules/db/models/transmit'))(osseus),
    tx: require(path.join(cwd, 'modules/db/models/transaction'))(osseus),
    wallet: require(path.join(cwd, 'modules/db/models/wallet'))(osseus)
  }
  osseus.lib = osseus.lib || {
    Currency: require(path.join(cwd, 'modules/lib/models/currency'))(osseus),
    Community: require(path.join(cwd, 'modules/lib/models/community'))(osseus),
    Transaction: require(path.join(cwd, 'modules/lib/models/transaction'))(osseus),
    BlockchainTransaction: require(path.join(cwd, 'modules/lib/models/blockchainTransaction'))(osseus)
  }
  osseus.helpers = {
    randomNum: (n) => { return Math.floor(Math.random() * n) },
    randomStr: (n) => { return Math.random().toString(36).substr(2, n) }
  }
  return osseus
}
