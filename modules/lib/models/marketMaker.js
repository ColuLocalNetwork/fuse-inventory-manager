const contract = require('truffle-contract')
const BigNumber = require('bignumber.js')

module.exports = (osseus) => {
  function marketMaker () {}

  marketMaker.create = (address, abi, tokenAddress1, tokenAddress2) => {
    return new Promise(async (resolve, reject) => {
      try {
        const data = {
          address: address,
          tokenAddress1: tokenAddress1,
          tokenAddress2: tokenAddress2,
          abi: abi
        }
        const newMarketMaker = await osseus.db_models.marketMaker.create(data)
        resolve(newMarketMaker)
      } catch (err) {
        reject(err)
      }
    })
  }

  marketMaker.getContracts = (marketMakerId, provider) => {
    return new Promise(async (resolve, reject) => {
      try {
        const marketMaker = await osseus.db_models.marketMaker.getById(marketMakerId)
        const contracts = {}

        const MM = contract({abi: marketMaker.abi})
        MM.setProvider(provider)
        contracts.mm = await MM.at(marketMaker.address)

        contracts.web3 = MM.web3

        resolve(contracts)
      } catch (err) {
        reject(err)
      }
    })
  }

  marketMaker.quote = (fromTokenAddress, toTokenAddress, amount, opts) => {
    return new Promise(async (resolve, reject) => {
      try {
        opts = opts || {}
        opts.pair = {tokenAddress1: fromTokenAddress, tokenAddress2: toTokenAddress}
        const marketMaker = await osseus.db_models.marketMaker.get(opts)
        const MarketMakerContract = new osseus.web3.eth.Contract(JSON.parse(marketMaker.abi), marketMaker.address)
        MarketMakerContract.methods.quote(fromTokenAddress, osseus.web3.utils.toHex(new BigNumber(amount)), toTokenAddress).call((err, quote) => {
          err ? reject(err) : resolve(quote)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  return marketMaker
}
