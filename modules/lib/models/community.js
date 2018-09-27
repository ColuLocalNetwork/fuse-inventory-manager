const crypto = require('crypto')
const bip39 = require('bip39')
const HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = (osseus) => {
  function community () {}

  const getProvider = (community) => {
    const provider = new HDWalletProvider([{
      mnemonic: community.mnemonic,
      password: crypto.createHash('sha256').update(`${community.id}_${osseus.config.secret}`).digest('base64')
    }], osseus.config.web3_provider, 0, 3)
    return provider
  }

  community.getProvider = (community) => {
    return getProvider(community)
  }

  community.create = (name, defaultCurrency, externalId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // create a new community - generate a mnemonic, create default balances for all wallets using default currency
        const mnemonic = bip39.generateMnemonic()

        const data = {
          name: name,
          mnemonic: mnemonic,
          defaultCurrency: defaultCurrency,
          exid: externalId
        }
        const newCommunity = await osseus.db_models.community.create(data)

        // create the provider
        const provider = getProvider(newCommunity)

        // create the wallets
        const defaultBalance = {
          currency: defaultCurrency,
          blockchainAmount: 0,
          offchainAmount: 0,
          pendingTxs: []
        }
        const wallets = [
          await osseus.db_models.wallet.create({address: provider.getAddress(0), type: 'manager', index: 0, balances: [defaultBalance]}),
          await osseus.db_models.wallet.create({address: provider.getAddress(1), type: 'users', index: 1, balances: [defaultBalance]}),
          await osseus.db_models.wallet.create({address: provider.getAddress(2), type: 'merchants', index: 2, balances: [defaultBalance]})
        ]

        // update community wallets in db
        const updatedCommunity = await osseus.db_models.community.update(newCommunity._id, {wallets: wallets.map(wallet => wallet.id)})
        updatedCommunity.wallets = wallets

        // resolve
        resolve(updatedCommunity)
      } catch (err) {
        reject(err)
      }
    })
  }

  community.get = (id, community) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!community) {
          community = await osseus.db_models.community.getById(id)
        }
        const provider = getProvider(community)
        community.currencyContracts = await osseus.lib.Currency.getContracts(community.defaultCurrency, provider)
        resolve(community)
      } catch (err) {
        reject(err)
      }
    })
  }

  return community
}
