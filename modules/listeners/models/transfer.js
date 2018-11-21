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
        osseus.logger.warn(`Transfer event to unknown address - from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)
        // TODO NOTIFY
      } else if (!knownFrom) {
        osseus.logger.info(`Transfer event from unknown address (deposit) - from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)
        const bctx = await osseus.lib.BlockchainTransaction.deposit(data.transactionHash, from, to, token, amount)
        osseus.logger.info(`Created blockchain deposit transaction: ${JSON.stringify(bctx)}`)
        const tx = await osseus.lib.Transaction.deposit({accountAddress: to, currency: token}, amount, bctx.id)
        osseus.logger.info(`Created offchain deposit transaction: ${JSON.stringify(tx)}`)
        // TODO NOTIFY
      } else {
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
    init: async () => {
      osseus.logger.silly(`Transfer events listener - init`)
      const currencies = await osseus.db_models.currency.getAllCCs()
      if (!currencies || currencies.length === 0) {
        osseus.logger.warn(`Transfer events listener - init - no currencies`)
        return
      }
      async.each(currencies, async (currency) => {
        const address = currency.currencyAddress
        const abi = JSON.parse(currency.currencyABI)
        osseus.logger.silly(`Transfer events listener - init - currency address: ${address}`)
        const CurrencyContract = new osseus.web3WS.eth.Contract(abi, address)
        CurrencyContract.events.Transfer(onEvent)
      }, (err) => {
        return err
          ? osseus.logger.warn(`Transfer events listener - init - error`, err)
          : osseus.logger.silly(`Transfer events listener - init - done`)
      })
    },

    getPastEvents: async () => {
      osseus.logger.silly(`Transfer events listener - getPastEvents`)
      const currencies = await osseus.db_models.currency.getAllCCs()
      if (!currencies || currencies.length === 0) {
        osseus.logger.warn(`Transfer events listener - getPastEvents - no currencies`)
        return
      }
      const pastEventsBlockLimit = osseus.config.past_events_block_limit || 1000
      async.each(currencies, async (currency) => {
        const address = currency.currencyAddress
        const abi = JSON.parse(currency.currencyABI)
        const creationBlock = currency.currencyBlockchainInfo.blockNumber
        const currentBlock = await osseus.web3.eth.getBlockNumber()
        const CurrencyContract = new osseus.web3.eth.Contract(abi, address)
        const lastBlock = await osseus.db_models.bcevent.getLastBlock(address)
        let fromBlock = Math.max(lastBlock, creationBlock) + 1
        let toBlock = fromBlock + pastEventsBlockLimit
        while (toBlock < currentBlock) {
          osseus.logger.silly(`Transfer events listener - getPastEvents - currency address: ${address}, fromBlock: ${fromBlock} toBlock: ${toBlock}`)
          CurrencyContract.getPastEvents('Transfer', {fromBlock: fromBlock, toBlock: toBlock})
            .then(handlePastEvents)
            .catch(err => osseus.logger.error(`Transfer events listener - getPastEvents - error`, err))
          fromBlock = toBlock + 1
          toBlock += pastEventsBlockLimit
        }
      }, (err) => {
        return err
          ? osseus.logger.error(`Transfer events listener - getPastEvents - error`, err)
          : osseus.logger.silly(`Transfer events listener - getPastEvents - done`)
      })
    }
  }
}
