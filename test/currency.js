const OsseusHelper = require('./helpers/osseus')
const expect = require('chai').expect

const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

contract('CURRENCY', async (accounts) => {
  let osseus

  let cln

  let currencyFactory

  let currencyAddress

  let currencyBlockchainInfo

  const validateCurrency = (currency1, currency2) => {
    expect(currency1).to.be.a('Object')
    expect(currency1.id).to.be.a('string')
    if (currency2) expect(currency1.id).to.equal(currency2.id)
    expect(currency1.address).to.equal(currency2 ? currency2.address : currencyAddress)
    expect(currency1.abi).to.equal(currency2 ? currency2.abi : osseus.config.abi.CommunityCurrency)
    expect(currency1.exid).to.be.a('string')
    if (currency2) expect(currency1.exid).to.equal(currency2.exid)
  }

  const createCurrency = async (name, symbol) => {
    const result = await currencyFactory.createCurrency(name, symbol, 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    const currencyAddress = result.logs[0].args.token

    await currencyFactory.openMarket(currencyAddress)

    return {
      currencyAddress: currencyAddress,
      currencyBlockchainInfo: {
        blockHash: result.logs[0].blockHash,
        blockNumber: result.logs[0].blockNumber,
        transactionHash: result.logs[0].transactionHash
      }
    }
  }

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const cc = await createCurrency('TestLocalCurrency', 'TLC')
    currencyAddress = cc.currencyAddress
    currencyBlockchainInfo = cc.currencyBlockchainInfo

    osseus = await OsseusHelper()
  })

  beforeEach(function () {
    osseus.helpers.clearDB()
  })

  it('should create a currency', async () => {
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    validateCurrency(currency)
  })

  it('should not create a currency with same address', async () => {
    await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10)).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency).to.be.undefined
  })

  it('should get currency (by id)', async () => {
    let currency1 = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.lib.Currency.getById(currency1.id)
    validateCurrency(currency1, currency2)
  })

  it('should get currency (by address)', async () => {
    let currency1 = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.lib.Currency.getByAddress(currency1.address)
    validateCurrency(currency1, currency2)
  })

  it('should get error if currency not found (by id)', async () => {
    let fakeId = '123abc'
    let currency1 = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    validateCurrency(currency1)
    let currency2 = await osseus.lib.Currency.getById(fakeId).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency2).to.be.undefined
  })

  it('should get all CCs', async () => {
    let n = osseus.helpers.randomNumNotZero(100)
    let currencies1 = []
    for (let i = 1; i <= n; i++) {
      let cc = await createCurrency(`TestLocalCurrency${i}`, `TLC${i}`)
      let currency = await osseus.lib.Currency.create(cc.currencyAddress, osseus.config.abi.CommunityCurrency, cc.currencyBlockchainInfo, osseus.helpers.randomStr(10))
      currencies1.push(currency)
    }

    let currencies2 = await osseus.db_models.currency.getAll({limit: 100})
    expect(currencies2).to.be.an('object')
    expect(currencies2.docs).to.be.an('array')
    expect(currencies2.docs).to.have.lengthOf(n)
    expect(currencies2.total).to.equal(n)
    currencies1.sort()
    currencies2.docs.sort()
    for (let i = 0; i < n; i++) {
      validateCurrency(currencies1[i], currencies2.docs[i])
    }
  })

  after(async function () {
    osseus.helpers.clearDB()
  })
})
