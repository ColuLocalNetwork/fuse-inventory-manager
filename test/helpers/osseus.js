const Osseus = require('osseus')
const path = require('path')
const cwd = process.cwd()

module.exports = async () => {
  let osseus = await Osseus.get()
  osseus.cwd = osseus.cwd || cwd
  osseus.db_models = osseus.db_models || {
    bctx: require(path.join(cwd, 'modules/db/models/blockchainTransaction'))(osseus),
    currency: require(path.join(cwd, 'modules/db/models/currency'))(osseus),
    community: require(path.join(cwd, 'modules/db/models/community'))(osseus),
    tx: require(path.join(cwd, 'modules/db/models/transaction'))(osseus),
    wallet: require(path.join(cwd, 'modules/db/models/wallet'))(osseus)
  }
  osseus.lib = osseus.lib || {
    Currency: require(path.join(cwd, 'modules/lib/models/currency'))(osseus),
    Community: require(path.join(cwd, 'modules/lib/models/community'))(osseus),
    Transaction: require(path.join(cwd, 'modules/lib/models/transaction'))(osseus),
    BlockchainTransaction: require(path.join(cwd, 'modules/lib/models/blockchainTransaction'))(osseus)
  }
  return osseus
}
