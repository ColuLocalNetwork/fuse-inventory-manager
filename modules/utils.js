const BigNumber = require('bignumber.js')

const getCurrencyFromToken = (token, community) => {
  this.osseus.logger.debug(`utils --> getCurrencyFromToken --> token: ${token}, community: ${JSON.stringify(community)}`)
  return new Promise(async (resolve, reject) => {
    try {
      const provider = await this.osseus.lib.Community.getProvider(community)
      const currency = await this.osseus.db_models.currency.getByAddress(token)
      const currencyContracts = await this.osseus.lib.Currency.getContracts(currency.id, provider)
      resolve({
        contract: currencyContracts.currency,
        web3: currencyContracts.web3
      })
    } catch (err) {
      reject(err)
    }
  })
}

const getBlockchainBalance = (address, token, bignum) => {
  this.osseus.logger.debug(`utils --> getBlockchainBalance --> address: ${address}, token: ${token}, bignum: ${bignum}`)
  return new Promise(async (resolve, reject) => {
    try {
      let balance = 0
      const community = await this.osseus.db_models.community.getByWalletAddress(address)
      if (token === 'ETH') {
        balance = this.osseus.web3.eth.getBalance(address)
        balance = this.osseus.web3.toDecimal(balance)
        balance = bignum ? new BigNumber(balance) : balance
      } else {
        const currency = await getCurrencyFromToken(token, community)
        balance = await currency.contract.balanceOf(address)
        balance = bignum ? balance : balance.toNumber()
      }
      resolve(balance)
    } catch (err) {
      reject(err)
    }
  })
}

const validateBlockchainBalance = (address, token) => {
  this.osseus.logger.debug(`utils --> validateBlockchainBalance --> address: ${address}, token: ${token}`)
  return new Promise(async (resolve, reject) => {
    try {
      const bcBalance = await getBlockchainBalance(address, token)
      const currency = await this.osseus.db_models.currency.getByAddress(token)
      const bcBalanceInDB = await this.osseus.db_models.wallet.getBlockchainBalance(address, currency.id)

      if (typeof bcBalance === 'undefined') {
        return reject(new Error(`Could not get blockchain balance - address: ${address}, token: ${token}`))
      }
      if (typeof bcBalanceInDB === 'undefined') {
        return reject(new Error(`Could not get blockchain balance (DB) - address: ${address}, token: ${token}`))
      }
      const result = bcBalance === bcBalanceInDB
      this.osseus.logger.debug(`validateBlockchainBalance --> address: ${address}, token: ${token}, bcBalance: ${bcBalance}, bcBalanceInDB: ${bcBalanceInDB}, result: ${result}`)
      resolve(result)
    } catch (err) {
      reject(err)
    }
  })
}

const validateAggregatedBalances = (currencyId) => {
  this.osseus.logger.debug(`utils --> validateAggregatedBalances --> currencyId: ${currencyId}`)
  return new Promise(async (resolve, reject) => {
    try {
      const aggregatedBalances = await this.osseus.db_models.wallet.aggregateBalancesPerCurrency(currencyId)
      const results = aggregatedBalances.map(balance => {
        balance.totalBlockchainAmount = balance.totalBlockchainAmount.toNumber()
        balance.totalOffchainAmount = balance.totalOffchainAmount.toNumber()
        balance.valid = balance.totalBlockchainAmount >= balance.totalOffchainAmount
        return balance
      })
      this.osseus.logger.debug(`validateAggregatedBalances --> currencyId: ${currencyId}, results: ${JSON.stringify(results)}`)
      resolve(results)
    } catch (err) {
      reject(err)
    }
  })
}

const updateBlockchainBalance = (address, token) => {
  this.osseus.logger.debug(`utils --> updateBlockchainBalance --> address: ${address}, token: ${token}`)
  return new Promise(async (resolve, reject) => {
    try {
      const currentBlock = await this.osseus.web3.eth.getBlockNumber()
      const balance = await getBlockchainBalance(address, token, true)
      const currency = await this.osseus.db_models.currency.getByAddress(token)
      if (typeof balance === 'undefined') {
        return reject(new Error(`Could not get blockchain balance - address: ${address}, token: ${token}`))
      }
      const result = await this.osseus.db_models.wallet.updateBlockchainBalance(address, currency.id, currentBlock, balance)
      resolve(result)
    } catch (err) {
      reject(err)
    }
  })
}

const getUnknownBlockchainTransactions = (filters, projection, limit, sort) => {
  return new Promise(async (resolve, reject) => {
    try {
      filters = filters || {}
      filters.known = false
      this.osseus.logger.debug(`filters: ${JSON.stringify(filters)}, projection: ${JSON.stringify(projection)}, limit: ${limit}, sort: ${JSON.stringify(sort)}`)
      const transactions = await this.osseus.db_models.bctx.get(filters, projection, limit, sort)
      this.osseus.logger.debug(`got ${transactions.length} unknown transactions`)
      resolve(transactions)
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
      getBlockchainBalance: getBlockchainBalance,
      validateBlockchainBalance: validateBlockchainBalance,
      validateAggregatedBalances: validateAggregatedBalances,
      updateBlockchainBalance: updateBlockchainBalance,
      getUnknownBlockchainTransactions: getUnknownBlockchainTransactions
    }
    osseus.logger.info(`Utils ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
