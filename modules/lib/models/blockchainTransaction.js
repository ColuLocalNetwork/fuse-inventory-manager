const BigNumber = require('bignumber.js')

module.exports = (osseus) => {
  function blockchainTransaction () {}

  const validateParticipant = (participant) => {
    return new Promise(async (resolve, reject) => {
      try {
        await osseus.db_models.community.getByWalletAddress(participant.accountAddress)
        let currency = await osseus.db_models.currency.getByCurrencyAddress(participant.currency)
        resolve({
          accountAddress: participant.accountAddress,
          currency: currency
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

  // https://github.com/colucom/ethereum-demo/blob/master/transferToken.js
  // https://github.com/ColuLocalNetwork/CLN-solidity/blob/master/test/BasicToken.js
  // https://github.com/ColuLocalNetwork/CLN-solidity/blob/master/test/ColuLocalNetwork.js
  blockchainTransaction.transfer = (from, to, amount) => {
    return new Promise(async (resolve, reject) => {
      osseus.logger.debug(`blockchainTransaction.transfer --> from: ${JSON.stringify(from)}, to: ${JSON.stringify(to)}, amount: ${amount}`)
      try {
        from = await validateParticipant(from)
        to = await validateParticipant(to)
        amount = await validateAmount(amount)
        // !!! TODO !!!
        resolve({from: from, to: to, amount: amount})
      } catch (err) {
        reject(err)
      }
    })
  }

  return blockchainTransaction
}
