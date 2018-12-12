const init = (osseus) => {
  this.osseus = osseus
  return new Promise(async (resolve, reject) => {
    this.osseus.lib = {
      BlockchainTransaction: require('./models/blockchainTransaction')(this.osseus),
      Community: require('./models/community')(this.osseus),
      Currency: require('./models/currency')(this.osseus),
      MarketMaker: require('./models/marketMaker')(this.osseus),
      Notification: require('./models/notification')(this.osseus),
      Transaction: require('./models/transaction')(this.osseus),
      Transmit: require('./models/transmit')(this.osseus),
      Wallet: require('./models/wallet')(this.osseus)
    }
    osseus.logger.info(`LIB ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
