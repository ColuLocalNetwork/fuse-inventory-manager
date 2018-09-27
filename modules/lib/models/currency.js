const contract = require('truffle-contract')

module.exports = (osseus) => {
  function currency () {}

  currency.create = (ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo) => {
    return new Promise(async (resolve, reject) => {
      const data = {
        ccAddress: ccAddress,
        mmAddress: mmAddress,
        ccABI: ccABI,
        mmABI: mmABI,
        ccBlockchainInfo: ccBlockchainInfo
      }
      await osseus.db_models.currency.create(data)
        .then(newCurrency => {
          resolve(newCurrency)
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  currency.getContracts = (currencyId, provider) => {
    return new Promise(async (resolve, reject) => {
      try {
        const currency = await osseus.db_models.currency.getById(currencyId)
        const contracts = {}

        const CC = contract({abi: currency.ccABI})
        CC.setProvider(provider)
        contracts.cc = await CC.at(currency.ccAddress)

        const MM = contract({abi: currency.mmABI})
        MM.setProvider(provider)
        contracts.mm = await MM.at(currency.mmAddress)

        contracts.web3 = CC.web3

        resolve(contracts)
      } catch (err) {
        reject(err)
      }
    })
  }

  return currency
}
