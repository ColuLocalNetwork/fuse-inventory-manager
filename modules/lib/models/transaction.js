module.exports = (osseus) => {
  function transaction () {}

  const validateParticipant = (participant) => {
    return new Promise(async (resolve, reject) => {
      await osseus.db_models.community.getByWalletAddress(participant.accountAddress).catch(err => { reject(err) })
      let currency = await osseus.db_models.currency.getByCurrencyAddress(participant.currency).catch(err => { reject(err) })
      resolve({
        accountAddress: participant.accountAddress,
        currency: currency.id
      })
    })
  }

  transaction.create = (from, to, amount) => {
    return new Promise(async (resolve, reject) => {
      from = await validateParticipant(from).catch(err => { reject(err) })
      to = await validateParticipant(to).catch(err => { reject(err) })

      await osseus.db_models.community.checkSufficientBalance(from.accountAddress, from.currency, 'offchainBalance', amount).catch(err => { reject(err) })

      const data = {
        from: from,
        to: to,
        amount: amount
      }
      const newTx = await osseus.db_models.tx.create(data).catch(err => { reject(err) })
      // TODO need to update offchainBalance of `from.accountAddress` and `to.accountAddress`
      resolve(newTx)
    })
  }

  return transaction
}
