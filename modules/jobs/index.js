const Agenda = require('agenda')

const init = (osseus) => {
  this.osseus = osseus
  return new Promise(async (resolve, reject) => {
    this.osseus.agenda = new Agenda({mongo: this.osseus.mongo})

    // events
    this.osseus.agenda.on('start', job => this.osseus.logger.debug(`Job ${job.attrs.name} starting`))
    this.osseus.agenda.on('complete', job => this.osseus.logger.debug(`Job ${job.attrs.name} finished`))
    this.osseus.agenda.on('success', job => this.osseus.logger.debug(`Job ${job.attrs.name} succeeded`))
    this.osseus.agenda.on('fail', job => this.osseus.logger.warn(`Job ${job}`))

    // job types
    require('./models/blockchainTransaction')(this.osseus)

    // start
    await this.osseus.agenda.start()

    osseus.logger.info(`Jobs ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
