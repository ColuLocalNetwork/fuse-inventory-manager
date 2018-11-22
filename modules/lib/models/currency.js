const contract = require('truffle-contract')

module.exports = (osseus) => {
  function currency () {}

  currency.createCLN = (address, abi, blockchainInfo, externalId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const data = {
          currencyType: 'CLN',
          address: address,
          abi: abi,
          exid: externalId,
          blockchainInfo: blockchainInfo
        }
        const newCurrency = await osseus.db_models.currency.create(data)
        await osseus.db_models.transmit.create({currency: newCurrency.id})
        resolve(newCurrency)
      } catch (err) {
        reject(err)
      }
    })
  }

  currency.create = (address, abi, blockchainInfo, externalId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const data = {
          address: address,
          abi: abi,
          exid: externalId,
          blockchainInfo: blockchainInfo
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

        const CLN = contract({abi: currency.abi})
        CLN.setProvider(provider)
        contracts.cln = await CLN.at(currency.address)

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

        const CC = contract({abi: currency.abi})
        CC.setProvider(provider)
        contracts.cc = await CC.at(currency.address)

        contracts.web3 = CC.web3

        resolve(contracts)
      } catch (err) {
        reject(err)
      }
    })
  }

  return currency
}
