const bip39 = require('bip39')
const HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = (osseus) => {
  function community () {}

  const getProvider = (community) => {
    const provider = new HDWalletProvider([{
      mnemonic: community.mnemonic,
      password: Buffer.from(`${community.id}_${osseus.config.secret}`).toString('base64')
    }], osseus.config.web3_provider, 0, 3)
    return provider
  }

  community.create = (name, defaultCurrency) => {
    return new Promise(async (resolve, reject) => {
      // create a new community - generate a mnemonic, create default balances for all wallets using default currency
      const mnemonic = bip39.generateMnemonic()
      const defaultBalance = {
        currency: defaultCurrency,
        blockchainBalance: 0,
        offchainBalance: 0
      }
      const data = {
        name: name,
        wallets: [
          {
            type: 'manager',
            index: 0,
            balances: [defaultBalance]
          },
          {
            type: 'users',
            index: 1,
            balances: [defaultBalance]
          },
          {
            type: 'merchants',
            index: 2,
            balances: [defaultBalance]
          }
        ],
        mnemonic: mnemonic,
        defaultCurrency: defaultCurrency
      }
      const newCommunity = await osseus.db_models.community.create(data).catch(err => { reject(err) })

      // create the provider
      const provider = getProvider(newCommunity)

      // update wallets for community in db
      const update = {}
      newCommunity.wallets.forEach(wallet => {
        update[`wallets.${wallet.index}.address`] = provider.getAddress(wallet.index)
      })
      const updatedCommunity = await osseus.db_models.community.update(newCommunity._id, update).catch(err => { reject(err) })

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
