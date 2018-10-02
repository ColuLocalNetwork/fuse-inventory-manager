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

  let ccAddress
  let mmAddress

  let ccBlockchainInfo

  const ccABI = JSON.stringify(require('./helpers/abi/cc'))
  const mmABI = JSON.stringify(require('./helpers/abi/mm'))

  const validateCurrency = (currency1, currency2) => {
    expect(currency1).to.be.a('Object')
    expect(currency1.id).to.be.a('string')
    if (currency2) expect(currency1.id).to.equal(currency2.id)
    expect(currency1.ccAddress).to.equal(currency2 ? currency2.ccAddress : ccAddress)
    expect(currency1.mmAddress).to.equal(currency2 ? currency2.mmAddress : mmAddress)
    expect(currency1.ccABI).to.equal(currency2 ? currency2.ccABI : ccABI)
    expect(currency1.mmABI).to.equal(currency2 ? currency2.mmABI : mmABI)
    expect(currency1.exid).to.be.a('string')
    if (currency2) expect(currency1.exid).to.equal(currency2.exid)
  }

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    const currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    ccAddress = result.logs[0].args.token
    ccBlockchainInfo = {
      blockHash: result.logs[0].blockHash,
      blockNumber: result.logs[0].blockNumber,
      transactionHash: result.logs[0].transactionHash
    }

    mmAddress = await currencyFactory.getMarketMakerAddressFromToken(ccAddress)

    await currencyFactory.openMarket(ccAddress)

    osseus = await OsseusHelper()
  })

  beforeEach(function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })

  it('should create a currency', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10))
    validateCurrency(currency)
  })

  it('should not create a currency with same address', async () => {
    await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10))
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10)).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency).to.be.undefined
  })

  it('should get currency (by id)', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.db_models.currency.getById(currency1.id)
    validateCurrency(currency1, currency2)
  })

  it('should get currency (by cc address)', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.db_models.currency.getByCurrencyAddress(currency1.ccAddress)
    validateCurrency(currency1, currency2)
  })

  it('should get currency (by mm address)', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.db_models.currency.getByMarketMakerAddress(currency1.mmAddress)
    validateCurrency(currency1, currency2)
  })

  it('should get error if currency not found (by id)', async () => {
    let fakeId = '123abc'
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10))
    validateCurrency(currency1)
    let currency2 = await osseus.db_models.currency.getById(fakeId).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency2).to.be.undefined
  })

  it('should get all currencies', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccBlockchainInfo, osseus.helpers.randomStr(10))
    let currencies = await osseus.db_models.currency.getAll()
    expect(currencies).to.be.an('array')
    expect(currencies).to.have.lengthOf(1)
    validateCurrency(currency1, currencies[0])
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
