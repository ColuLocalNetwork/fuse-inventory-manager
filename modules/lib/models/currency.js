const contract = require('truffle-contract')

module.exports = (osseus) => {
  function currency () {}

  currency.create = (ccAddress, mmAddress, ccABI, mmABI) => {
    return new Promise(async (resolve, reject) => {
      const data = {
        ccAddress: ccAddress,
        mmAddress: mmAddress,
        ccABI: ccABI,
        mmABI: mmABI
      }
      const newCurrency = await osseus.db_models.currency.create(data).catch(err => { reject(err) })
      resolve(newCurrency)
    })
  }

  currency.getContracts = (currencyId, provider) => {
    return new Promise(async (resolve, reject) => {
      const currency = await osseus.db_models.currency.getById(currencyId).catch(err => { reject(err) })
      const contracts = {}

      try {
        const CC = contract({abi: currency.ccABI})
        CC.setProvider(provider)
        contracts.cc = await CC.at(currency.ccAddress)

        const MM = contract({abi: currency.mmABI})
        MM.setProvider(provider)
        MM.setProvider(provider)
        contracts.mm = await MM.at(currency.mmAddress)

        resolve(contracts)
      } catch (err) {
        reject(err)
      }
    })
  }

  return currency
}
