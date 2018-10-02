const BigNumber = require('bignumber.js')
const coder = require('web3-eth-abi')
const async = require('async')

module.exports = (osseus) => {
  function blockchainTransaction () {}

  const validateAmount = (amount) => {
    return new Promise(async (resolve, reject) => {
      amount = new BigNumber(amount)
      if (amount.lte(0)) {
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
        const currency = await osseus.utils.getCurrencyFromToken(token, community)
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
        const currency = await osseus.utils.getCurrencyFromToken(fromToken, community)
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

  blockchainTransaction.deposit = (txHash, from, to, token, amount) => {
    osseus.logger.debug(`blockchainTransaction.deposit --> txHash: ${txHash} from: ${from}, to: ${to}, token: ${token}, amount: ${amount}`)
    return new Promise(async (resolve, reject) => {
      try {
        const community = await osseus.db_models.community.getByWalletAddress(to)
        const currency = await osseus.utils.getCurrencyFromToken(token, community)
        currency.web3.eth.getTransaction(txHash, async (err, tx) => {
          if (err) {
            return reject(err)
          }
          tx.type = 'DEPOSIT'
          tx.meta = {from: from, to: to, token: token, amount: amount.toString()}
          const result = await osseus.db_models.bctx.create(tx)
          osseus.logger.debug(`blockchainTransaction.deposit --> result: ${JSON.stringify(result)}`)
          resolve(result)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  blockchainTransaction.syncState = (address, type, limit, sort) => {
    osseus.logger.debug(`blockchainTransaction.syncState --> address: ${address}, type: ${type}, limit: ${limit}, sort: ${sort}`)
    return new Promise(async (resolve, reject) => {
      try {
        const filters = {
          state: {$ne: 'FINALIZED'}
        }

        if (address) filters.address = address
        if (type) filters.type = type

        const projection = {
          hash: 1
        }

        osseus.logger.debug(`filters: ${JSON.stringify(filters)}, projection: ${JSON.stringify(projection)}, limit: ${limit}, sort: ${JSON.stringify(sort)}`)
        const transactions = await osseus.db_models.bctx.get(filters, projection, limit, sort)
        osseus.logger.debug(`got ${transactions.length} transactions`)

        const latestBlock = await osseus.web3.eth.getBlock('latest')
        osseus.logger.debug(`latestBlock.number: ${latestBlock.number}`)

        transactions && async.map(transactions, (transaction, done) => {
          osseus.web3.eth.getTransaction(transaction.hash, async (err, tx) => {
            if (err) {
              return done(err)
            }

            if (!tx) {
              return done(new Error(`could not getTransaction for hash: ${transaction.hash}`))
            }

            osseus.logger.silly(`tx: ${JSON.stringify(tx)}`)
            let newState
            if (tx.blockNumber) {
              newState = 'CONFIRMED'
              if (latestBlock.number - tx.blockNumber >= osseus.config.blocks_to_finalize_bctx) {
                newState = 'FINALIZED'
              }
            }
            let updatedTransaction = await osseus.db_models.bctx.update(transaction._id, {state: newState, blockHash: tx.blockHash, blockNumber: tx.blockNumber})
            done(null, updatedTransaction)
          })
        }, (err, updatedTransactions) => {
          if (err) {
            return reject(err)
          }
          resolve(updatedTransactions)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  return blockchainTransaction
}
