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

  const bcTransfer = async (data) => {
    let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount, data.opts)
    return bctx
  }

  transaction.create = (from, to, amount) => {
    return new Promise(async (resolve, reject) => {
      try {
        from = await validateParticipant(from)
        to = await validateParticipant(to)
        amount = await validateAmount(amount)

        const data = {
          from: from,
          to: to,
          amount: amount
        }
        const newTx = await osseus.db_models.tx.create(data)
        resolve(newTx)
      } catch (err) {
        reject(err)
      }
    })
  }

  transaction.transmit = (address, currency, limit, sort) => {
    return new Promise(async (resolve, reject) => {
      try {
        const filters = {
          state: 'DONE'
        }
        if (address) filters.fromAddress = address
        if (currency) filters.currency = currency

        const projection = {
          'from.accountAddress': 1,
          'from.currency': 1,
          'to.accountAddress': 1,
          amount: 1
        }

        osseus.logger.debug(`filters: ${JSON.stringify(filters)}, projection: ${JSON.stringify(projection)}, limit: ${limit}, sort: ${JSON.stringify(sort)}`)
        const transactions = await osseus.db_models.tx.get(filters, projection, limit, sort, true)
        osseus.logger.debug(`got ${transactions.length} transactions`)

        const transmitData = {}
        transactions.forEach(transaction => {
          let txid = transaction._id.toString()
          let from = transaction.from.accountAddress
          let token = transaction.from.currency.ccAddress
          let to = transaction.to.accountAddress
          let amount = new BigNumber(transaction.amount)
          osseus.logger.silly(`txid: ${txid}, from: ${from}, to: ${to}, amount: ${amount.toNumber()}`)
          transmitData[from] = transmitData[from] || {}
          transmitData[from][to] = transmitData[from][to] || {token: token, amount: new BigNumber(0), ids: []}
          transmitData[from][to].amount = transmitData[from][to].amount.plus(amount)
          transmitData[from][to].ids.push(txid)
        })
        osseus.logger.debug(`transmitData: ${JSON.stringify(transmitData)}`)

        const transmit = []
        Object.keys(transmitData).forEach(from => {
          Object.keys(transmitData[from]).forEach(async to => {
            transmit.push({from: from.toString(), to: to, token: transmitData[from][to].token, amount: transmitData[from][to].amount})
          })
        })
        const transmittedTxs = await Promise.mapSeries(transmit, tx => { return bcTransfer(tx) })
        osseus.logger.debug(`transmittedTxs: ${JSON.stringify(transmittedTxs)}`)

        // TODO update db as transmitted

        resolve(transmittedTxs)
      } catch (err) {
        reject(err)
      }
    })
  }

  return transaction
}
