const crypto = require('crypto')
const bip39 = require('bip39')
const HDWalletProvider = require('truffle-hdwallet-provider')

module.exports = (osseus) => {
  function community () {}

  const getProvider = (community, nWallets) => {
    const data = {
      mnemonic: community.mnemonic,
      password: crypto.createHash('sha256').update(`${community.uuid}_${osseus.config.secret}`).digest('base64')
    }
    const provider = new HDWalletProvider([data], osseus.config.web3_provider, 0, nWallets)
    return provider
  }

  community.getProvider = (community) => {
    return getProvider(community, community.wallets.length)
  }

  community.create = (name, defaultCurrency, externalId, wallets) => {
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

        const nWallets = (wallets && wallets.length) || 3

        // create the provider
        const provider = getProvider(newCommunity, nWallets)

        // create default balance
        const defaultBalance = {
          currency: defaultCurrency,
          blockchainAmount: 0,
          blockNumberOfLastUpdate: 0,
          offchainAmount: 0,
          pendingTxs: []
        }

        if (!wallets || wallets.length === 0) {
          wallets = [
            await osseus.db_models.wallet.create({address: provider.getAddress(0), type: 'manager', index: 0, balances: [defaultBalance]}),
            await osseus.db_models.wallet.create({address: provider.getAddress(1), type: 'users', index: 1, balances: [defaultBalance]}),
            await osseus.db_models.wallet.create({address: provider.getAddress(2), type: 'merchants', index: 2, balances: [defaultBalance]})
          ]
        } else {
          const hasManager = wallets.filter(w => w.type === 'manager').length === 1
          if (!hasManager) {
            return reject(new Error(`Cannot create community - wallets must have a 'manager' wallet`))
          }

          const tasks = []
          wallets.forEach((w, i) => {
            tasks.push(new Promise(async (resolve, reject) => {
              let wallet = await osseus.db_models.wallet.create({address: provider.getAddress(i), type: w.type, index: i, balances: [defaultBalance], exid: w.exid})
              resolve(wallet)
            }))
          })
          wallets = await Promise.all(tasks, res => { return res })
        }

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
        community = community || await osseus.db_models.community.getByIdPopulated(id)
        const provider = getProvider(community, community.wallets.length)
        const currencyContracts = await osseus.lib.Currency.getContractsForCC(community.defaultCurrency, provider)
        resolve({
          community: community,
          provider: provider,
          currencyContracts: currencyContracts
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  return community
}
