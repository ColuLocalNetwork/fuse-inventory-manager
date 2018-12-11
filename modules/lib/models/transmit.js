module.exports = (osseus) => {
  function transmit () {}

  transmit.getById = (transmitId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const transmit = await osseus.db_models.transmit.getById(transmitId)
        resolve(transmit)
      } catch (err) {
        reject(err)
      }
    })
  }

  return transmit
}
