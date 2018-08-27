const BigNumber = require('bignumber.js')
const contract = require('truffle-contract')

module.exports = (osseus) => {
  function blockchainTransaction () {}

  const getCurrencyFromToken = (token, community) => {
    return new Promise(async (resolve, reject) => {
      try {
        const result = {}
        if (token === osseus.config.cln_address) {
          osseus.logger.silly(`getCurrencyFromToken --> CLN: ${token}`)
          const provider = await osseus.lib.Community.getProvider(community)
          const CLN = contract({abi: osseus.config.cln_abi})
          CLN.setProvider(provider)
          result.contract = await CLN.at(token)
          result.web3 = CLN.web3
        } else {
          osseus.logger.silly(`getCurrencyFromToken --> CC: ${token}`)
          const communityWithContracts = await osseus.lib.Community.get(community.id, community)
          if (communityWithContracts.currencyContracts.cc.address !== token) {
            return reject(new Error(`Unrecognized token: ${token} for community: ${community.id}`))
          }
          result.contract = communityWithContracts.currencyContracts.cc
          result.web3 = communityWithContracts.currencyContracts.web3
        }
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  }

  const validateAmount = (amount) => {
    return new Promise(async (resolve, reject) => {
      amount = new BigNumber(amount)
      if (amount.eq(0) || amount.lt(0)) {
        reject(new Error(`amount must be positive`))
      }
      if (amount.isNaN()) {
        reject(new Error(`amount illegal`))
      }
      resolve(amount)
    })
  }

  blockchainTransaction.transfer = (from, to, token, amount, opts) => {
    osseus.logger.debug(`blockchainTransaction.transfer --> from: ${JSON.stringify(from)}, to: ${JSON.stringify(to)}, amount: ${amount}`)
    return new Promise(async (resolve, reject) => {
      try {
        const community = await osseus.db_models.community.getByWalletAddress(from)
        const currency = await getCurrencyFromToken(token, community)
        amount = await validateAmount(amount)
        opts = opts || {}
        opts.from = from
        const receipt = await currency.contract.transfer(to, amount.toString(), opts)
        osseus.logger.debug(`blockchainTransaction.transfer --> receipt: ${JSON.stringify(receipt)}`)
        currency.web3.eth.getTransaction(receipt.tx, async (err, tx) => {
          if (err) {
            return reject(err)
          }
          const result = await osseus.db_models.bctx.create(tx) // TODO what should be the state of the created transaction
          osseus.logger.debug(`blockchainTransaction.transfer --> result: ${JSON.stringify(result)}`)
          resolve(result)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  return blockchainTransaction
}
