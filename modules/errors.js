const init = (osseus) => {
  this.osseus = osseus
  return new Promise((resolve, reject) => {
    osseus.server.app.use((err, req, res, next) => {
      const status = err.status || (err.res && err.res.statusCode) || 500
      const error = osseus.config.env && osseus.config.env.toLowerCase() === 'production' ? (err.message || err) : err
      osseus.logger.error('ERROR!', error)
      res.status(status).send({error: error.toString()})
    })

    osseus.logger.info(`Error handling ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
