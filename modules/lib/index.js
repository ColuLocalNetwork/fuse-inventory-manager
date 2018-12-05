const init = (osseus) => {
  this.osseus = osseus
  return new Promise(async (resolve, reject) => {
    this.osseus.lib = {
      Community: require('./models/community')(this.osseus),
      Currency: require('./models/currency')(this.osseus),
      MarketMaker: require('./models/marketMaker')(this.osseus),
      Notification: require('./models/notification')(this.osseus),
      Transaction: require('./models/transaction')(this.osseus),
      BlockchainTransaction: require('./models/blockchainTransaction')(this.osseus)
    }
    osseus.logger.info(`LIB ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
