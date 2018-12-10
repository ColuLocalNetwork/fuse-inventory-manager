const init = (osseus) => {
  this.osseus = osseus
  return new Promise(async (resolve, reject) => {
    if (osseus.config.no_listeners) {
      osseus.lib.Notification.warning(`LISTENER`, null, `Disabled in config`)
      osseus.logger.warn(`Listeners skipped`)
      return resolve()
    }
    const transferListener = require('./models/transfer')(osseus)
    const pastEventsInterval = parseInt((osseus.config.past_events_interval || 60000), 10)
    setInterval(async () => {
      await transferListener.getPastEvents()
    }, pastEventsInterval)
    osseus.logger.info(`Listeners ready`)
    resolve()
  })
}

module.exports = {
  init: init
}
