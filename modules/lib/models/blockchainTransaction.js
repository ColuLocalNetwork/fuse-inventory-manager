const BigNumber = require('bignumber.js')
const contract = require('truffle-contract')
const coder = require('web3-eth-abi')

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

  const encodeChangeData = (toToken, minReturn) => {
    const CHANGE_ON_TRANSFER_ABI = {
      name: 'change',
      type: 'function',
      inputs: [
        {
          type: 'address',
          name: 'toToken'
        }
      ]
    }

    const CHANGE_ON_TRANSFER_WITH_MIN_ABI = {
      name: 'change',
      type: 'function',
      inputs: [
        {
          type: 'address',
          name: 'toToken'
        },
        {
          type: 'uint256',
          name: 'minReturn'
        }
      ]
    }

    let abi, params
    if (minReturn) {
      abi = CHANGE_ON_TRANSFER_WITH_MIN_ABI
      params = [toToken, minReturn]
    } else {
      abi = CHANGE_ON_TRANSFER_ABI
      params = [toToken]
    }
    return coder.encodeFunctionCall(abi, params)
  }

  blockchainTransaction.transfer = (from, to, token, amount, opts) => {
    osseus.logger.debug(`blockchainTransaction.transfer --> from: ${from}, to: ${to}, token: ${token}, amount: ${amount}, opts: ${JSON.stringify(opts)}`)
    return new Promise(async (resolve, reject) => {
      try {
        const community = await osseus.db_models.community.getByWalletAddress(from)
        const currency = await getCurrencyFromToken(token, community)
        amount = await validateAmount(amount)
        opts = opts || {}
        opts.from = opts.from || from
        const receipt = await currency.contract.transfer(to, amount.toString(), opts)
        osseus.logger.debug(`blockchainTransaction.transfer --> receipt: ${JSON.stringify(receipt)}`)
        currency.web3.eth.getTransaction(receipt.tx, async (err, tx) => {
          if (err) {
            return reject(err)
          }
          tx.type = 'TRANSFER'
          tx.meta = {from: from, to: to, token: token, amount: amount.toString()}
          const result = await osseus.db_models.bctx.create(tx)
          osseus.logger.debug(`blockchainTransaction.transfer --> result: ${JSON.stringify(result)}`)
          resolve({
            receipt: receipt,
            result: result
          })
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  blockchainTransaction.change = (from, fromToken, toToken, marketMaker, amount, opts) => {
    osseus.logger.debug(`blockchainTransaction.change --> from: ${from}, fromToken: ${fromToken}, toToken: ${toToken}, marketMaker: ${marketMaker}, amount: ${amount}, opts: ${JSON.stringify(opts)}`)
    return new Promise(async (resolve, reject) => {
      try {
        const community = await osseus.db_models.community.getByWalletAddress(from)
        const currency = await getCurrencyFromToken(fromToken, community)
        amount = await validateAmount(amount)
        opts = opts || {}
        opts.from = opts.from || from
        const changeData = encodeChangeData(toToken, opts.minReturn)
        const receipt = await currency.contract.transferAndCall(marketMaker, amount.toString(), changeData, opts)
        osseus.logger.debug(`blockchainTransaction.change --> receipt: ${JSON.stringify(receipt)}`)
        currency.web3.eth.getTransaction(receipt.tx, async (err, tx) => {
          if (err) {
            return reject(err)
          }
          tx.type = 'CHANGE'
          tx.meta = {from: from, fromToken: fromToken, toToken: toToken, amount: amount.toString()}
          const result = await osseus.db_models.bctx.create(tx)
          osseus.logger.debug(`blockchainTransaction.change --> result: ${JSON.stringify(result)}`)
          resolve({
            receipt: receipt,
            result: result
          })
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  return blockchainTransaction
}
