const async = require('async')
const BigNumber = require('bignumber.js')

module.exports = (osseus) => {
  const onEvent = (err, data) => {
    return new Promise(async (resolve, reject) => {
      if (err) {
        osseus.logger.warn(`Transfer events listener - onEvent error`, err)
        return reject(err)
      }
      osseus.logger.debug(`Transfer events listener - onEvent data`, data)
      await osseus.db_models.bcevent.create(data)

      const token = data.address
      const from = data.returnValues.from
      const to = data.returnValues.to
      const amount = new BigNumber(data.returnValues.value)

      const knownFrom = await osseus.db_models.wallet.checkAddressExists(from)
      const knownTo = await osseus.db_models.wallet.checkAddressExists(to)
      osseus.logger.silly(`Transfer events listener - onEvent addresses - from: ${from}, knownFrom: ${knownFrom}, to: ${to}, knownTo: ${knownTo}`)

      if (!knownTo) {
        osseus.lib.Notification.warning(`TRANSFER_EVENT`, null, `To unknown`, null, {from: from, to: to, amount: amount.toNumber()})
        osseus.logger.warn(`Transfer event to unknown address - from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)
      } else if (!knownFrom) {
        osseus.lib.Notification.info(`TRANSFER_EVENT`, null, `From unknown`, null, {from: from, to: to, amount: amount.toNumber()})
        osseus.logger.info(`Transfer event from unknown address (deposit) - from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)
        const bctx = await osseus.lib.BlockchainTransaction.deposit(data.transactionHash, from, to, token, amount)
        osseus.logger.info(`Created blockchain deposit transaction: ${JSON.stringify(bctx)}`)
        const tx = await osseus.lib.Transaction.deposit({accountAddress: to, currency: token}, amount, bctx.id)
        osseus.logger.info(`Created offchain deposit transaction: ${JSON.stringify(tx)}`)
        osseus.lib.Notification.info(`TRANSFER_EVENT`, null, `Deposit created`, null, {bctx: bctx.id, tx: tx.id})
      } else {
        osseus.lib.Notification.info(`TRANSFER_EVENT`, null, `Known`, null, {from: from, to: to, amount: amount.toNumber()})
        osseus.logger.info(`Transfer event with known addresses - from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)
        data.type = 'TRANSFER'
        data.state = 'DONE'
        data.meta = {from: from, to: to, token: token, amount: amount.toString()}
        const update = {
          $set: data,
          $setOnInsert: {
            created_at: new Date(),
            updated_at: new Date(),
            known: false
          }
        }
        const bctx = await osseus.db_models.bctx.update({hash: data.transactionHash}, update)
        osseus.logger.debug(`Updated blockchain transaction: ${JSON.stringify(bctx)}`)

        const updatedBlockchainBalanceResult = {}
        updatedBlockchainBalanceResult.from = await osseus.utils.updateBlockchainBalance(from, token)
        updatedBlockchainBalanceResult.to = await osseus.utils.updateBlockchainBalance(to, token)
        osseus.logger.debug(`Updated blockchain balances: ${JSON.stringify(updatedBlockchainBalanceResult)}`)
      }

      resolve()
    })
  }

  const handlePastEvents = (pastEvents) => {
    if (!pastEvents || pastEvents.length === 0) {
      return
    }
    osseus.logger.silly(`Transfer events listener - handlePastEvents ${JSON.stringify(pastEvents)}`)
    pastEvents.forEach(event => {
      onEvent(null, event)
    })
  }

  return {
    getPastEvents: async () => {
      const getContractEvents = (contract, address, fromBlock, toBlock) => {
        osseus.logger.silly(`Transfer events listener - getPastEvents - get - currency address: ${address}, fromBlock: ${fromBlock} toBlock: ${toBlock}`)
        contract.getPastEvents('Transfer', {fromBlock: fromBlock, toBlock: toBlock})
          .then(handlePastEvents)
          .catch(err => {
            osseus.lib.Notification.warning(`LISTENER`, null, `Transfer events - getContractEvents`, null, err)
            osseus.logger.error(`Transfer events listener - getPastEvents - error`, err)
          })
      }

      const getBatchOfCurrencies = async (offset, limit) => {
        osseus.logger.silly(`Transfer events listener - getBatchOfCurrencies - offset: ${offset}, limit: ${limit}`)
        return osseus.db_models.currency.getAll({offset: offset, limit: limit})
      }

      const processBatchOfCurrencies = async (currencies) => {
        async.each(currencies, async (currency) => {
          osseus.logger.silly(`Transfer events listener - processBatchOfCurrencies - currency: ${currency.address}`)
          const address = currency.address
          const abi = JSON.parse(currency.abi)
          const creationBlock = currency.blockchainInfo.blockNumber
          const currentBlock = await osseus.web3.eth.getBlockNumber()
          const CurrencyContract = new osseus.web3.eth.Contract(abi, address)
          const lastBlock = await osseus.db_models.bcevent.getLastBlock(address)
          let fromBlock = Math.max(lastBlock, creationBlock) + 1
          let toBlock = fromBlock + pastEventsBlockLimit
          while (toBlock < currentBlock) {
            getContractEvents(CurrencyContract, address, fromBlock, toBlock)
            fromBlock = toBlock + 1
            toBlock += pastEventsBlockLimit
          }
          getContractEvents(CurrencyContract, address, fromBlock, 'latest')
        }, (err) => {
          if (err) {
            osseus.lib.Notification.warning(`LISTENER`, null, `Transfer events - processBatchOfCurrencies`, null, err)
            osseus.logger.error(`Transfer events listener - processBatchOfCurrencies - error`, err)
          }
          osseus.logger.silly(`Transfer events listener - processBatchOfCurrencies - done`)
        })
      }

      osseus.logger.silly(`Transfer events listener - getPastEvents`)
      const pastEventsBlockLimit = osseus.config.past_events_block_limit || 1000
      const limit = osseus.config.currencies_batch_size || 10

      let offset = 0
      let currenciesData = await getBatchOfCurrencies(offset, limit)
      while (currenciesData && currenciesData.docs && currenciesData.docs.length && currenciesData.total) {
        await processBatchOfCurrencies(currenciesData.docs)
        offset += limit
        currenciesData = await getBatchOfCurrencies(offset, limit)
      }
      osseus.logger.silly(`Transfer events listener - getPastEvents - done`)
    }
  }
}
