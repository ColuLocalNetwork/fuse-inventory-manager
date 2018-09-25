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

      const from = data.returnValues.from
      const to = data.returnValues.to
      const amount = new BigNumber(data.returnValues.value)

      const knownFrom = await osseus.db_models.wallet.checkAddressExists(from)
      const knownTo = await osseus.db_models.wallet.checkAddressExists(to)
      osseus.logger.silly(`Transfer events listener - onEvent known addresses - from: ${from}, knownFrom: ${knownFrom}, to: ${from}, knownTo: ${knownTo}`)

      if (!knownFrom || !knownTo) {
        osseus.logger.warn(`Transfer event from/to unknown addresses - from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)
        // TODO here probably need to notify someone/somehow
      }
      resolve()
    })
  }

  const handlePastEvents = (pastEvents) => {
    osseus.logger.debug(`Transfer events listener - handlePastEvents ${JSON.stringify(pastEvents)}`)
    if (!pastEvents || pastEvents.length === 0) {
      return
    }
    pastEvents.forEach(event => {
      onEvent(null, event)
    })
  }

  return {
    init: async () => {
      const currencies = await osseus.db_models.currency.getAll()
      if (!currencies || currencies.length === 0) {
        osseus.logger.warn(`Transfer events listener - init - no currencies`)
        return
      }
      async.each(currencies, async (currency) => {
        const address = currency.ccAddress
        const abi = JSON.parse(currency.ccABI)
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
      const currencies = await osseus.db_models.currency.getAll()
      if (!currencies || currencies.length === 0) {
        osseus.logger.warn(`Transfer events listener - getPastEvents - no currencies`)
        return
      }
      async.each(currencies, async (currency) => {
        const address = currency.ccAddress
        const abi = JSON.parse(currency.ccABI)
        const CurrencyContract = new osseus.web3WS.eth.Contract(abi, address)
        const lastBlock = await osseus.db_models.bcevent.getLastBlock(address)
        const fromBlock = lastBlock + 1
        osseus.logger.debug(`Transfer events listener - getPastEvents - currency address: ${address}, fromBlock: ${fromBlock}`)
        CurrencyContract.getPastEvents('Transfer', {fromBlock: fromBlock, toBlock: 'latest'})
          .then(handlePastEvents)
          .catch(err => osseus.logger.error(`Transfer events listener - getPastEvents - error`, err))
      }, (err) => {
        return err
          ? osseus.logger.error(`Transfer events listener - getPastEvents - error`, err)
          : osseus.logger.silly(`Transfer events listener - getPastEvents - done`)
      })
    }
  }
}
