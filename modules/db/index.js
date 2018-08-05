const init = (osseus) => {
  this.osseus = osseus
  return new Promise((resolve, reject) => {
    this.osseus.db_models = {
      blockchainTransaction: require('./models/blockchainTransaction')(this.osseus.mongo)
    }
    osseus.logger.info(`DB ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
