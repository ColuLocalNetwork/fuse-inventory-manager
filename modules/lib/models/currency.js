const contract = require('truffle-contract')

module.exports = (osseus) => {
  function currency () {}

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

  currency.getContracts = (currencyId, provider) => {
    return new Promise(async (resolve, reject) => {
      try {
        const currency = await osseus.db_models.currency.getById(currencyId)
        const contracts = {}

        const CurrencyContract = contract({abi: currency.abi})
        CurrencyContract.setProvider(provider)
        contracts.currency = await CurrencyContract.at(currency.address)

        contracts.web3 = CurrencyContract.web3

        resolve(contracts)
      } catch (err) {
        reject(err)
      }
    })
  }

  currency.getById = (currencyId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const currency = await osseus.db_models.currency.getById(currencyId)
        resolve(currency)
      } catch (err) {
        reject(err)
      }
    })
  }

  currency.getByAddress = (currencyAddress) => {
    return new Promise(async (resolve, reject) => {
      try {
        const currency = await osseus.db_models.currency.getByAddress(currencyAddress)
        resolve(currency)
      } catch (err) {
        reject(err)
      }
    })
  }

  currency.update = (condition, updateData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const updatedCurrency = await osseus.db_models.currency.update(condition, updateData)
        resolve(updatedCurrency)
      } catch (err) {
        reject(err)
      }
    })
  }

  return currency
}
