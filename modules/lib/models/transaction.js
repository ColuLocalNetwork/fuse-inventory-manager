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

  transaction.create = (from, to, amount) => {
    return new Promise(async (resolve, reject) => {
      try {
        from = await validateParticipant(from)
        to = await validateParticipant(to)

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

  return transaction
}
