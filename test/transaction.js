const OsseusHelper = require('./helpers/osseus')
const expect = require('chai').expect

const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

contract('TRANSACTION', async (accounts) => {
  let osseus

  let cln

  let ccAddress
  let mmAddress

  const ccABI = JSON.stringify(require('./helpers/abi/cc'))
  const mmABI = JSON.stringify(require('./helpers/abi/mm'))

  const validateTransaction = (tx1, tx2, from, to, amount) => {
    expect(tx1).to.be.a('Object')
    expect(tx1.id).to.be.a('string')
    if (tx2) expect(tx1.id).to.equal(tx2.id)
    expect(tx1.from.accountAddress).to.equal(tx2 ? tx2.from.accountAddress : from.accountAddress)
    expect(tx1.from.currency.toString()).to.equal(tx2 ? tx2.from.currency.toString() : from.currency)
    expect(tx1.to.accountAddress).to.equal(tx2 ? tx2.to.accountAddress : to.accountAddress)
    expect(tx1.to.currency.toString()).to.equal(tx2 ? tx2.to.currency.toString() : to.currency)
    expect(tx1.amount.toNumber()).to.be.greaterThan(0)
    expect(tx1.amount.toNumber()).to.equal(tx2 ? tx2.amount.toNumber() : amount)
    expect(tx1.state).to.equal(tx2 ? tx2.state : 'NEW')
  }

  const createCommunity = async (currency) => {
    await osseus.db_models.community.create({
      name: 'Test Community',
      wallets: [
        {
          type: 'manager',
          address: accounts[0],
          index: 0,
          balances: [
            {
              currency: currency.id,
              blockchainBalance: 0,
              offchainBalance: 100 * TOKEN_DECIMALS
            }
          ]
        },
        {
          type: 'users',
          address: accounts[1],
          index: 1,
          balances: [
            {
              currency: currency.id,
              blockchainBalance: 0,
              offchainBalance: 100 * TOKEN_DECIMALS
            }
          ]
        }
      ],
      mnemonic: 'grainedness unlimned afara overfeast parsonology steeplechasing vireo metantimonous stra amygdaloncus supraspinous preceremonial',
      defaultCurrency: currency.id
    })
  }

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    const currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
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

  it('should create a transaction', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: accounts[0], currency: ccAddress}
    let to = {accountAddress: accounts[1], currency: ccAddress}

    let tx = await osseus.lib.Transaction.create(from, to, amount)

    from.currency = currency.id
    to.currency = currency.id
    validateTransaction(tx, undefined, from, to, amount)
  })

  it('should get transaction (by id)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: accounts[0], currency: ccAddress}
    let to = {accountAddress: accounts[1], currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)
    let tx2 = await osseus.db_models.tx.getById(tx1.id)
    validateTransaction(tx1, tx2)
  })

  it('should get error if transaction not found (by id)', async () => {
    let fakeId = '123abc'

    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: accounts[0], currency: ccAddress}
    let to = {accountAddress: accounts[1], currency: ccAddress}

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
    let from = {accountAddress: accounts[0], currency: ccAddress}
    let to = {accountAddress: accounts[1], currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)

    let txs = await osseus.db_models.tx.get({address: accounts[0]}) // from.accountAddress
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])

    txs = await osseus.db_models.tx.get({address: accounts[1]}) // to.accountAddress
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])
  })

  it('should get transaction (by state)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: accounts[0], currency: ccAddress}
    let to = {accountAddress: accounts[1], currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)

    let txs = await osseus.db_models.tx.get({state: 'NEW'})
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])
  })

  it('should get transaction (by currency)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)

    await createCommunity(currency)

    let amount = 10 * TOKEN_DECIMALS
    let from = {accountAddress: accounts[0], currency: ccAddress}
    let to = {accountAddress: accounts[1], currency: ccAddress}

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
    let from = {accountAddress: accounts[0], currency: ccAddress}
    let to = {accountAddress: accounts[1], currency: ccAddress}

    let tx1 = await osseus.lib.Transaction.create(from, to, amount)

    let txs = await osseus.db_models.tx.get({address: accounts[0], currency: currency.id, state: 'NEW'})
    expect(txs).to.be.an('array')
    expect(txs).to.have.lengthOf(1)
    validateTransaction(tx1, txs[0])
  })
})
