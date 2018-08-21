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

  community.create = (name, defaultCurrency) => {
    return new Promise(async (resolve, reject) => {
      // create a new community - generate a mnemonic, create default balances for all wallets using default currency
      const mnemonic = bip39.generateMnemonic()

      const data = {
        name: name,
        mnemonic: mnemonic,
        defaultCurrency: defaultCurrency
      }
      const newCommunity = await osseus.db_models.community.create(data).catch(err => { reject(err) })

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
        await osseus.db_models.wallet.create({address: provider.getAddress(0), type: 'manager', index: 0, balances: [defaultBalance]}).catch(err => { reject(err) }),
        await osseus.db_models.wallet.create({address: provider.getAddress(1), type: 'users', index: 1, balances: [defaultBalance]}).catch(err => { reject(err) }),
        await osseus.db_models.wallet.create({address: provider.getAddress(2), type: 'merchants', index: 2, balances: [defaultBalance]}).catch(err => { reject(err) })
      ]

      // update community wallets in db
      const updatedCommunity = await osseus.db_models.community.update(newCommunity._id, {wallets: wallets.map(wallet => wallet.id)}).catch(err => { reject(err) })
      updatedCommunity.wallets = wallets

      // resolve
      resolve(updatedCommunity)
    })
  }

  community.get = (id, community) => {
    return new Promise(async (resolve, reject) => {
      if (!community) {
        community = await osseus.db_models.community.getById(id).catch(err => { reject(err) })
      }
      const provider = getProvider(community)
      community.currencyContracts = await osseus.lib.Currency.getContracts(community.defaultCurrency, provider).catch(err => { reject(err) })
      resolve(community)
    })
  }

  return community
}
