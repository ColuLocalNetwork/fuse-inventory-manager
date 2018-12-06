const Agenda = require('agenda')

const init = (osseus) => {
  this.osseus = osseus
  return new Promise(async (resolve, reject) => {
    this.osseus.agenda = new Agenda({mongo: this.osseus.mongo})

    // events
    this.osseus.agenda.on('start', job => {
      osseus.lib.Notification.info(`JOB`, null, `Start`, null, job.attrs)
      this.osseus.logger.debug(`Job ${job.attrs.name} starting`)
    })
    this.osseus.agenda.on('complete', job => {
      osseus.lib.Notification.info(`JOB`, null, `Complete`, null, job.attrs)
      this.osseus.logger.debug(`Job ${job.attrs.name} finished`)
    })
    this.osseus.agenda.on('success', job => {
      osseus.lib.Notification.info(`JOB`, null, `Success`, null, job.attrs)
      this.osseus.logger.debug(`Job ${job.attrs.name} succeeded`)
    })
    this.osseus.agenda.on('fail', job => {
      osseus.lib.Notification.warning(`JOB`, null, `Fail`, null, job.attrs)
      this.osseus.logger.warn(`Job ${job}`)
    })

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
