const contract = require('truffle-contract')

const getCurrencyFromToken = (token, community) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = {}
      if (token === this.osseus.config.cln_address) {
        this.osseus.logger.silly(`getCurrencyFromToken --> CLN: ${token}`)
        const provider = await this.osseus.lib.Community.getProvider(community)
        const CLN = contract({abi: this.osseus.config.cln_abi})
        CLN.setProvider(provider)
        result.contract = await CLN.at(token)
        result.web3 = CLN.web3
      } else {
        this.osseus.logger.silly(`getCurrencyFromToken --> CC: ${token}`)
        const communityWithContracts = await this.osseus.lib.Community.get(community.id, community)
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

const checkBalance = (address, token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let balance = 0
      const community = await this.osseus.db_models.community.getByWalletAddress(address)
      if (token === 'ETH') {
        balance = this.osseus.web3.eth.getBalance(address)
        balance = this.osseus.web3.toDecimal(balance)
      } else {
        const currency = await getCurrencyFromToken(token, community)
        balance = await currency.contract.balanceOf(address)
        balance = balance.toNumber()
      }
      resolve(balance)
    } catch (err) {
      reject(err)
    }
  })
}

const init = (osseus) => {
  this.osseus = osseus
  return new Promise((resolve, reject) => {
    osseus.utils = {
      getCurrencyFromToken: getCurrencyFromToken,
      checkBalance: checkBalance
    }
    osseus.logger.info(`Utils ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
