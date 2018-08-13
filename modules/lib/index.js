const init = (osseus) => {
  this.osseus = osseus

  const initCurrencies = async () => {
    const currenciesFromDB = await this.osseus.db_models.currency.getAll().catch(err => { osseus.logger.warn(err) })
    const currencies = {}
    currenciesFromDB && currenciesFromDB.forEach(currency => {
      const currencyId = currency._id.toString()
      currencies[currencyId] = new this.osseus.lib.Currency(this.osseus.db_models.currency, currency)
    })
    return currencies
  }

  const initCommunities = async () => {
    const communitiesFromDB = await this.osseus.db_models.community.getAll().catch(err => { osseus.logger.warn(err) })
    const communities = {}
    communitiesFromDB && communitiesFromDB.forEach(community => {
      const communityId = community._id.toString()
      communities[communityId] = new this.osseus.lib.Community(this.osseus.db_models.community, community)
    })
    return communities
  }

  return new Promise(async (resolve, reject) => {
    this.osseus.lib = {
      Community: require('./models/community'),
      Currency: require('./models/currency')
    }

    this.osseus.currencies = await initCurrencies().catch(err => { return reject(err) })
    osseus.logger.trace(`currencies: ${Object.keys(this.osseus.currencies)}`)
    this.osseus.communities = await initCommunities().catch(err => { return reject(err) })
    osseus.logger.trace(`communities: ${Object.keys(this.osseus.communities)}`)

    osseus.logger.info(`LIB ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
