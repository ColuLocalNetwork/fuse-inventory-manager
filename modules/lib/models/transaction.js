const BigNumber = require('bignumber.js')
const Promise = require('bluebird')

module.exports = (osseus) => {
  function transaction () {}

  const validateParticipant = (participant) => {
    return new Promise(async (resolve, reject) => {
      try {
        await osseus.db_models.community.getByWalletAddress(participant.accountAddress)
        let currency = await osseus.db_models.currency.getByCurrencyAddress(participant.currency)
        resolve({
          accountAddress: participant.accountAddress,
          currency: currency.id
        })
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

  const validateBlockchainBalances = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const tasks = []
        const wallets = await osseus.db_models.wallet.getAll()
        osseus.logger.debug(`found ${wallets.length} wallets`)
        wallets.forEach(wallet => {
          let address = wallet.address
          let currencies = wallet.balances.map(balance => balance.currency.ccAddress)
          currencies.forEach(currency => {
            tasks.push(new Promise(async (resolve, reject) => {
              try {
                let valid = await osseus.utils.validateBlockchainBalance(address, currency)
                resolve({address: address, currency: currency, valid: valid})
              } catch (err) {
                reject(err)
              }
            }))
          })
        })
        osseus.logger.debug(`about to perform ${tasks.length} tasks`)
        const results = await Promise.all(tasks, task => { return task })
        osseus.logger.debug(`task results: ${JSON.stringify(results)}`)
        const invalid = results.filter(res => !res.valid)
        if (invalid.length > 0) {
          // TODO here probably need to notify someone/somehow
          return reject(new Error(`Invalid blockchain balance - ${JSON.stringify(invalid)}`))
        }
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }

  const validateAggregatedBalances = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const results = await osseus.utils.validateAggregatedBalances()
        const invalid = results.filter(res => !res.valid)
        if (invalid.length > 0) {
          // TODO here probably need to notify someone/somehow
          return reject(new Error(`Invalid aggregated balances - ${JSON.stringify(invalid)}`))
        }
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }

  const updateBlockchainBalances = () => {
    return new Promise(async (resolve, reject) => {
      try {
        const tasks = []
        const wallets = await osseus.db_models.wallet.getAll()
        osseus.logger.debug(`found ${wallets.length} wallets`)
        wallets.forEach(wallet => {
          let address = wallet.address
          let currencies = wallet.balances.map(balance => balance.currency.ccAddress)
          currencies.forEach(currency => {
            tasks.push(new Promise(async (resolve, reject) => {
              try {
                let updated = await osseus.utils.updateBlockchainBalance(address, currency)
                resolve({address: address, currency: currency, updated: updated})
              } catch (err) {
                reject(err)
              }
            }))
          })
        })
        osseus.logger.debug(`about to perform ${tasks.length} tasks`)
        const results = await Promise.all(tasks, task => { return task })
        osseus.logger.debug(`task results: ${JSON.stringify(results)}`)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }

  const selectTransactionsToTransmit = (opts) => {
    return new Promise(async (resolve, reject) => {
      try {
        const filters = {
          context: 'transfer',
          state: 'DONE'
        }
        if (opts.filters && opts.filters.address) filters.fromAddress = opts.filters.address
        if (opts.filters && opts.filters.currency) filters.currency = opts.filters.currency

        const projection = {
          'from.accountAddress': 1,
          'from.currency': 1,
          'to.accountAddress': 1,
          amount: 1
        }

        osseus.logger.debug(`filters: ${JSON.stringify(filters)}, projection: ${JSON.stringify(projection)}, limit: ${opts.limit}, sort: ${JSON.stringify(opts.sort)}`)
        const transactions = await osseus.db_models.tx.get(filters, projection, opts.limit, opts.sort, true)
        // TODO need to mark the transactions as SELECTED and get the back in one atomic query
        osseus.logger.debug(`got ${transactions.length} transactions`)
        resolve(transactions)
      } catch (err) {
        reject(err)
      }
    })
  }

  const prepareTransactionsToBeTransmitted = (transactions, bctxOpts) => {
    return new Promise(async (resolve, reject) => {
      try {
        const transmitDataPerToken = {}
        transactions.forEach(transaction => {
          let txid = transaction._id.toString()
          let from = transaction.from.accountAddress
          let token = transaction.from.currency.ccAddress
          let to = transaction.to.accountAddress
          let amount = new BigNumber(transaction.amount)

          osseus.logger.silly(`token: ${token}, txid: ${txid}, from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)

          transmitDataPerToken[token] = transmitDataPerToken[token] || {}
          transmitDataPerToken[token][from] = (transmitDataPerToken[token][from] || new BigNumber(0)).minus(amount)

          transmitDataPerToken[token] = transmitDataPerToken[token] || {}
          transmitDataPerToken[token][to] = (transmitDataPerToken[token][to] || new BigNumber(0)).plus(amount)
        })

        const bctxs = []
        Object.keys(transmitDataPerToken).forEach(token => {
          let sum = new BigNumber(0)
          let negatives = []
          let positives = []
          Object.keys(transmitDataPerToken[token]).forEach(account => {
            let amount = transmitDataPerToken[token][account]
            sum = sum.plus(amount)
            if (amount > 0) {
              positives.push({account: account, amount: amount})
            } else if (amount < 0) {
              negatives.push({account: account, amount: amount})
            }
          })
          if (sum.toNumber() !== 0) {
            throw new Error(`Transactions for token: ${token} are not adding up to zero !!!`)
          }

          while (negatives.length > 0 && positives.length > 0) {
            let nObj = negatives[0]
            let pObj = positives.splice(0, 1)[0]
            nObj.amount += pObj.amount
            bctxs.push({from: nObj.account, to: pObj.account, amount: pObj.amount, token: token, opts: bctxOpts})
            if (nObj.amount < 0) {
              negatives.push(nObj)
            }
          }

          resolve(bctxs)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  const transmitToBlockchain = (bctxs, txids) => {
    return new Promise(async (resolve, reject) => {
      try {
        const transmittedBctxs = await Promise.mapSeries(bctxs, async tx => {
          let bctx = await osseus.lib.BlockchainTransaction.transfer(tx.from, tx.to, tx.token, tx.amount, tx.opts)
          return bctx
        })

        osseus.logger.debug(`transmittedBctxs: ${JSON.stringify(transmittedBctxs)}`)
        osseus.logger.debug(`transaction ids to update: ${JSON.stringify(txids)}`)

        const transmit = await osseus.db_models.transmit.create({offchainTransactions: txids, blockchainTransactions: transmittedBctxs.map(tbctx => tbctx.result.id)})
        osseus.logger.debug(`transmit: ${JSON.stringify(transmit)}`)

        const nUpdated = await osseus.db_models.tx.markAsTransmitted(txids, transmit.id)
        osseus.logger.debug(`nUpdated: ${nUpdated}`)

        resolve({
          txs: txids,
          bctxs: transmittedBctxs,
          transmit: transmit,
          nUpdated: nUpdated
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.transfer = (from, to, amount) => {
    return new Promise(async (resolve, reject) => {
      try {
        from = await validateParticipant(from)
        to = await validateParticipant(to)
        amount = await validateAmount(amount)

        const data = {
          from: from,
          to: to,
          amount: amount,
          context: 'transfer'
        }
        const newTx = await osseus.db_models.tx.create(data)
        resolve(newTx)
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.deposit = (to, amount, transmit) => {
    return new Promise(async (resolve, reject) => {
      try {
        to = await validateParticipant(to)
        amount = await validateAmount(amount)

        const data = {
          to: to,
          amount: amount,
          transmit: transmit,
          context: 'deposit'
        }
        const newTx = await osseus.db_models.tx.createDeposit(data)
        await osseus.db_models.transmit.update(transmit, {offchainTransactions: [newTx.id]})
        resolve(newTx)
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.transmit = (opts) => {
    return new Promise(async (resolve, reject) => {
      try {
        await validateBlockchainBalances()
        await validateAggregatedBalances()

        const transactions = await selectTransactionsToTransmit(opts)
        const txids = transactions.map(transaction => transaction._id.toString())
        const bctxs = await prepareTransactionsToBeTransmitted(transactions, opts.bc)
        const result = await transmitToBlockchain(bctxs, txids, opts)

        await updateBlockchainBalances()
        await validateBlockchainBalances()

        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  }

  return transaction
}
