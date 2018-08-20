const Osseus = require('osseus')
const path = require('path')
const cwd = process.cwd()

module.exports = async () => {
  let osseus = await Osseus.get()
  osseus.cwd = osseus.cwd || cwd
  osseus.db_models = osseus.db_models || {
    bctx: require(path.join(cwd, 'modules/db/models/blockchainTransaction'))(osseus.mongo),
    currency: require(path.join(cwd, 'modules/db/models/currency'))(osseus.mongo),
    community: require(path.join(cwd, 'modules/db/models/community'))(osseus.mongo),
    tx: require(path.join(cwd, 'modules/db/models/transaction'))(osseus.mongo)
  }
  osseus.lib = osseus.lib || {
    Currency: require(path.join(cwd, 'modules/lib/models/currency'))(osseus),
    Community: require(path.join(cwd, 'modules/lib/models/community'))(osseus),
    Transaction: require(path.join(cwd, 'modules/lib/models/transaction'))(osseus)
  }
  return osseus
}
