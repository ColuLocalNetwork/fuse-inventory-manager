const OsseusHelper = require('./helpers/osseus')
const expect = require('chai').expect
const Promise = require('bluebird')

const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

const A_LOT_OF_TXS = 250

contract('TRANSACTION', async (accounts) => {
  let osseus

  let cln

  let ccAddress
  let mmAddress

  const ccABI = JSON.stringify(require('./helpers/abi/cc'))
  const mmABI = JSON.stringify(require('./helpers/abi/mm'))

  const managerAccountAddress = accounts[0]
  const usersAccountAddress = accounts[1]
  const merchantsAccountAddress = accounts[2]

  const defaultBalances = {}
  defaultBalances[managerAccountAddress] = A_LOT_OF_TXS * TOKEN_DECIMALS
  defaultBalances[usersAccountAddress] = A_LOT_OF_TXS * TOKEN_DECIMALS
  defaultBalances[merchantsAccountAddress] = A_LOT_OF_TXS * TOKEN_DECIMALS

  const validateTransaction = (tx1, tx2, from, to, amount, state) => {
    expect(tx1).to.be.a('Object')
    expect(tx1.id).to.be.a('string')
    if (tx2) expect(tx1.id).to.equal(tx2.id)
    expect(tx1.from.accountAddress).to.equal(tx2 ? tx2.from.accountAddress : from.accountAddress)
    expect(tx1.from.currency.toString()).to.equal(tx2 ? tx2.from.currency.toString() : from.currency)
    expect(tx1.to.accountAddress).to.equal(tx2 ? tx2.to.accountAddress : to.accountAddress)
    expect(tx1.to.currency.toString()).to.equal(tx2 ? tx2.to.currency.toString() : to.currency)
    expect(tx1.amount.toNumber()).to.be.greaterThan(0)
    expect(tx1.amount.toNumber()).to.equal(tx2 ? tx2.amount.toNumber() : amount)
    expect(tx1.state).to.equal(tx2 ? tx2.state : (state || 'DONE'))
  }

  const validateBalancesAfterTransaction = (participantEnd, tx) => {
    return new Promise(async (resolve, reject) => {
      const accountAddress = tx[participantEnd].accountAddress
      const currency = tx[participantEnd].currency.toString()
      const state = tx.state
      const amount = tx.amount.toNumber()
      const wallet = await osseus.db_models.wallet.getByAddress(accountAddress)
      const startingBalance = defaultBalances[accountAddress]
      const currencyBalance = wallet.balances.filter(balance => balance.currency.toString() === currency)[0]
      const actualBalance = currencyBalance.offchainAmount.toNumber()
      if (state === 'DONE') {
        expect(actualBalance).to.equal(participantEnd === 'from' ? startingBalance - amount : startingBalance + amount)
      }
      if (state === 'CANCELED') {
        expect(actualBalance).to.equal(startingBalance)
      }
      expect(currencyBalance.pendingTxs).to.be.an('array')
      expect(currencyBalance.pendingTxs).to.have.lengthOf(0)
      resolve()
    })
  }

  const createCommunity = async (currency) => {
    let newCommunity = await osseus.db_models.community.create({
      name: 'Test Community',
      mnemonic: 'grainedness unlimned afara overfeast parsonology steeplechasing vireo metantimonous stra amygdaloncus supraspinous preceremonial',
      defaultCurrency: currency.id
    })

    // create the wallets
    const wallets = [
      await osseus.db_models.wallet.create({
        address: managerAccountAddress,
        type: 'manager',
        index: 0,
        balances: [{
          currency: currency,
          blockchainAmount: 0,
          offchainAmount: defaultBalances[managerAccountAddress],
          pendingTxs: []
        }]
      }),
      await osseus.db_models.wallet.create({
        address: usersAccountAddress,
        type: 'users',
        index: 1,
        balances: [{
          currency: currency,
          blockchainAmount: 0,
          offchainAmount: defaultBalances[usersAccountAddress],
          pendingTxs: []
        }]
      }),
      await osseus.db_models.wallet.create({
        address: merchantsAccountAddress,
        type: 'merchants',
        index: 2,
        balances: [{
          currency: currency,
          blockchainAmount: 0,
          offchainAmount: defaultBalances[merchantsAccountAddress],
          pendingTxs: []
        }]
      })
    ]

    // update community wallets in db
    await osseus.db_models.community.update(newCommunity._id, {wallets: wallets.map(wallet => wallet.id)})
  }

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    const currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: managerAccountAddress})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: managerAccountAddress})
    ccAddress = result.logs[0].args.token

    mmAddress = await currencyFactory.getMarketMakerAddressFromToken(ccAddress)

    await currencyFactory.openMarket(ccAddress)

    osseus = await OsseusHelper()
  })

  beforeEach(function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })

  it('should make a successful transaction (state should be DONE)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx = await osseus.lib.Transaction.create(from, to, amount)

    from.currency = currency.id
    to.currency = currency.id
    validateTransaction(tx, undefined, from, to, amount)
    await validateBalancesAfterTransaction('from', tx)
    await validateBalancesAfterTransaction('to', tx)
  })

  it('should not make a transaction if not enough balance (state should be CANCELED)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10001 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx = await osseus.lib.Transaction.create(from, to, amount)

    from.currency = currency.id
    to.currency = currency.id
    validateTransaction(tx, undefined, from, to, amount, 'CANCELED')
    await validateBalancesAfterTransaction('from', tx)
    await validateBalancesAfterTransaction('to', tx)
  })

  it('should get transaction (by id)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)
    let tx2 = await osseus.db_models.tx.getById(tx1.id)
    validateTransaction(tx1, tx2)
  })

  it('should get error if transaction not found (by id)', async () => {
    let fakeId = '123abc'

    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)
    from.currency = currency.id
    to.currency = currency.id
    validateTransaction(tx1, undefined, from, to, amount)

    let tx2 = await osseus.db_models.tx.getById(fakeId).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(tx2).to.be.undefined
  })

  it('should get transaction (by address)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)

    let txs = await osseus.db_models.tx.get({address: managerAccountAddress}) // from.accountAddress
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])

    txs = await osseus.db_models.tx.get({address: usersAccountAddress}) // to.accountAddress
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])
  })

  it('should get transaction (by state)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)

    let txs = await osseus.db_models.tx.get({state: 'DONE'})
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])
  })

  it('should get transaction (by currency)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)

    let txs = await osseus.db_models.tx.get({currency: currency.id})
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])
  })

  it('should get transaction (by multiple conditions)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: managerAccountAddress, currency: ccAddress}
    let to = {accountAddress: usersAccountAddress, currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)

    let txs = await osseus.db_models.tx.get({address: managerAccountAddress, currency: currency.id, state: 'DONE'})
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])
  })

  describe('A LOT', async () => {
    it('should make a lot of successful tranasctions', async () => {
      const generateTransactions = (n) => {
        const txs = []
        for (let i = 0; i < n; i++) {
          const fromAccount = accounts[Math.floor(Math.random() * 3)]
          const toAccount = accounts[Math.floor(Math.random() * 3)]
          let from = {accountAddress: fromAccount, currency: ccAddress}
          let to = {accountAddress: toAccount, currency: ccAddress}
          let amount = 1 * TOKEN_DECIMALS
          txs.push(makeTransaction(from, to, amount))
        }
        return txs
      }

      const makeTransaction = (from, to, amount) => {
        return new Promise(async (resolve, reject) => {
          try {
            let tx = await osseus.lib.Transaction.create(from, to, amount)
            from.currency = currency.id
            to.currency = currency.id
            validateTransaction(tx, undefined, from, to, amount)
            resolve(tx)
          } catch (err) {
            reject(err)
          }
        })
      }

      let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

      await createCommunity(currency)

      const lotsOfTxs = generateTransactions(A_LOT_OF_TXS)

      await Promise.each(lotsOfTxs, tx => { return tx })
        .then(results => {
          expect(results).to.have.lengthOf(A_LOT_OF_TXS)
          results.forEach(result => {
            expect(result).not.to.be.undefined
          })
        })
    })
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
