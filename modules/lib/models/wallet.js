module.exports = (osseus) => {
  function wallet () {}

  wallet.create = (address, type, index, balances, externalId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const wallet = await osseus.db_models.wallet.create({
          address: address,
          type: type,
          index: index,
          balances: balances,
          exid: externalId
        })
        resolve(wallet)
      } catch (err) {
        reject(err)
      }
    })
  }

  wallet.getById = (walletId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const wallet = await osseus.db_models.wallet.getById(walletId)
        resolve(wallet)
      } catch (err) {
        reject(err)
      }
    })
  }

  wallet.getByAddress = (walletAddress) => {
    return new Promise(async (resolve, reject) => {
      try {
        const wallet = await osseus.db_models.wallet.getByAddress(walletAddress)
        resolve(wallet)
      } catch (err) {
        reject(err)
      }
    })
  }

  wallet.update = (condition, updateData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const updateWallet = await osseus.db_models.wallet.update(condition, updateData)
        resolve(updateWallet)
      } catch (err) {
        reject(err)
      }
    })
  }

  return wallet
}
