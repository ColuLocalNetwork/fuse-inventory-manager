const init = (osseus) => {
  this.osseus = osseus
  return new Promise((resolve, reject) => {
    this.osseus.db_models = {
      bctx: require('./models/blockchainTransaction')(this.osseus.mongo),
      community: require('./models/community')(this.osseus.mongo),
      currency: require('./models/currency')(this.osseus.mongo)
    }
    osseus.logger.info(`DB ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
