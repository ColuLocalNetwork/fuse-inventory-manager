const contract = require('truffle-contract')

module.exports = (osseus) => {
  function currency () {}

  currency.createCLN = (currencyAddress, currencyABI, currencyBlockchainInfo, externalId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const data = {
          currencyType: 'CLN',
          currencyAddress: currencyAddress,
          currencyABI: currencyABI,
          exid: externalId,
          currencyBlockchainInfo: currencyBlockchainInfo
        }
        const newCurrency = await osseus.db_models.currency.create(data)
        await osseus.db_models.transmit.create({currency: newCurrency.id})
        resolve(newCurrency)
      } catch (err) {
        reject(err)
      }
    })
  }

  currency.create = (currencyAddress, marketMakerAddress, currencyABI, marketMakerABI, currencyBlockchainInfo, externalId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const data = {
          currencyAddress: currencyAddress,
          marketMakerAddress: marketMakerAddress,
          currencyABI: currencyABI,
          marketMakerABI: marketMakerABI,
          exid: externalId,
          currencyBlockchainInfo: currencyBlockchainInfo
        }
        const newCurrency = await osseus.db_models.currency.create(data)
        await osseus.db_models.transmit.create({currency: newCurrency.id})
        resolve(newCurrency)
      } catch (err) {
        reject(err)
      }
    })
  }

  currency.getCLN = (provider) => {
    return new Promise(async (resolve, reject) => {
      try {
        const currency = await osseus.db_models.currency.getCLN()
        const contracts = {}

        const CLN = contract({abi: currency.currencyABI})
        CLN.setProvider(provider)
        contracts.cln = await CLN.at(currency.currencyAddress)

        contracts.web3 = CLN.web3

        resolve({currency: currency, contracts: contracts})
      } catch (err) {
        reject(err)
      }
    })
  }

  currency.getContractsForCC = (currencyId, provider) => {
    return new Promise(async (resolve, reject) => {
      try {
        const currency = await osseus.db_models.currency.getById(currencyId)
        const contracts = {}

        const CC = contract({abi: currency.currencyABI})
        CC.setProvider(provider)
        contracts.cc = await CC.at(currency.currencyAddress)

        const MM = contract({abi: currency.marketMakerABI})
        MM.setProvider(provider)
        contracts.mm = await MM.at(currency.marketMakerAddress)

        contracts.web3 = CC.web3

        resolve(contracts)
      } catch (err) {
        reject(err)
      }
    })
  }

  return currency
}
