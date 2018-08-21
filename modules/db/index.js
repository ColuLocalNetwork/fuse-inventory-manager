const init = (osseus) => {
  this.osseus = osseus
  return new Promise((resolve, reject) => {
    this.osseus.db_models = {
      bctx: require('./models/blockchainTransaction')(this.osseus),
      community: require('./models/community')(this.osseus),
      currency: require('./models/currency')(this.osseus),
      tx: require('./models/transaction')(this.osseus),
      wallet: require('./models/wallet')(this.osseus)
    }
    osseus.logger.info(`DB ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
