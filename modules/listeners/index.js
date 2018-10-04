const init = (osseus) => {
  this.osseus = osseus
  return new Promise(async (resolve, reject) => {
    if (osseus.config.no_listeners) {
      osseus.logger.warn(`Listeners skipped`)
      return resolve()
    }
    await require('./models/transfer')(osseus).getPastEvents()
    await require('./models/transfer')(osseus).init()
    osseus.logger.info(`Listeners ready`)
    resolve()
  })
}

module.exports = {
  init: init
}
