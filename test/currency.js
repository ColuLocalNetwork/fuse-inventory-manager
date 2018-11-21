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
  let marketMakerAddress

  let currencyBlockchainInfo
  let clnBlockchainInfo

  const validateCLN = (currency) => {
    expect(currency).to.be.a('Object')
    expect(currency.id).to.be.a('string')
    expect(currency.currencyAddress).to.equal(cln.address)
    expect(currency.currencyABI).to.equal(osseus.config.abi.CLN)
    expect(currency.exid).to.be.a('string')
  }

  const validateCurrency = (currency1, currency2) => {
    expect(currency1).to.be.a('Object')
    expect(currency1.id).to.be.a('string')
    if (currency2) expect(currency1.id).to.equal(currency2.id)
    expect(currency1.currencyAddress).to.equal(currency2 ? currency2.currencyAddress : currencyAddress)
    expect(currency1.marketMakerAddress).to.equal(currency2 ? currency2.marketMakerAddress : marketMakerAddress)
    expect(currency1.currencyABI).to.equal(currency2 ? currency2.currencyABI : osseus.config.abi.CommunityCurrency)
    expect(currency1.marketMakerABI).to.equal(currency2 ? currency2.marketMakerABI : osseus.config.abi.MarketMaker)
    expect(currency1.exid).to.be.a('string')
    if (currency2) expect(currency1.exid).to.equal(currency2.exid)
  }

  const createCC = async (name, symbol) => {
    const result = await currencyFactory.createCurrency(name, symbol, 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    const currencyAddress = result.logs[0].args.token

    marketMakerAddress = await currencyFactory.getMarketMakerAddressFromToken(currencyAddress)

    await currencyFactory.openMarket(currencyAddress)

    return {
      currencyAddress: currencyAddress,
      currencyBlockchainInfo: {
        blockHash: result.logs[0].blockHash,
        blockNumber: result.logs[0].blockNumber,
        transactionHash: result.logs[0].transactionHash
      },
      marketMakerAddress: marketMakerAddress
    }
  }

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    const clnCreationBlock = await web3.eth.getTransaction(cln.transactionHash)
    clnBlockchainInfo = {
      blockHash: clnCreationBlock.blockHash,
      blockNumber: clnCreationBlock.blockNumber,
      transactionHash: cln.transactionHash
    }
    await cln.makeTokensTransferable()

    currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const cc = await createCC('TestLocalCurrency', 'TLC')
    currencyAddress = cc.currencyAddress
    currencyBlockchainInfo = cc.currencyBlockchainInfo
    marketMakerAddress = cc.marketMakerAddress

    osseus = await OsseusHelper()
  })

  beforeEach(function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })

  it('should create a CLN currency', async () => {
    let currency = await osseus.lib.Currency.createCLN(cln.address, osseus.config.abi.CLN, clnBlockchainInfo, osseus.helpers.randomStr(10))
    validateCLN(currency)
  })

  it('should not create more than one CLN currency', async () => {
    let currency1 = await osseus.lib.Currency.createCLN(cln.address, osseus.config.abi.CLN, clnBlockchainInfo, osseus.helpers.randomStr(10))
    validateCLN(currency1)

    let currency2 = await osseus.lib.Currency.createCLN(cln.address, osseus.config.abi.CLN, clnBlockchainInfo, osseus.helpers.randomStr(10)).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency2).to.be.undefined
  })

  it('should create a currency', async () => {
    let currency = await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    validateCurrency(currency)
  })

  it('should not create a currency with same address', async () => {
    await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let currency = await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, currencyBlockchainInfo, osseus.helpers.randomStr(10)).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency).to.be.undefined
  })

  it('should get the CLN', async () => {
    await osseus.lib.Currency.createCLN(cln.address, osseus.config.abi.CLN, clnBlockchainInfo, osseus.helpers.randomStr(10))
    let CLN = await osseus.lib.Currency.getCLN(osseus.helpers.provider)
    validateCLN(CLN.currency)
  })

  it('should not get the CLN if not exists', async () => {
    let currency = await osseus.lib.Currency.getCLN(osseus.helpers.provider).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency).to.be.undefined
  })

  it('should get currency (by id)', async () => {
    let currency1 = await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.db_models.currency.getById(currency1.id)
    validateCurrency(currency1, currency2)
  })

  it('should get currency (by currency address)', async () => {
    let currency1 = await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.db_models.currency.getByCurrencyAddress(currency1.currencyAddress)
    validateCurrency(currency1, currency2)
  })

  it('should get currency (by market maker address)', async () => {
    let currency1 = await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let currency2 = await osseus.db_models.currency.getByMarketMakerAddress(currency1.marketMakerAddress)
    validateCurrency(currency1, currency2)
  })

  it('should get error if currency not found (by id)', async () => {
    let fakeId = '123abc'
    let currency1 = await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    validateCurrency(currency1)
    let currency2 = await osseus.db_models.currency.getById(fakeId).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency2).to.be.undefined
  })

  it('should get all CCs', async () => {
    await osseus.lib.Currency.createCLN(cln.address, osseus.config.abi.CLN, clnBlockchainInfo, osseus.helpers.randomStr(10))

    let n = (osseus.helpers.randomNum(10) + 1)
    let currencies1 = []
    for (let i = 1; i <= n; i++) {
      let cc = await createCC(`TestLocalCurrency${i}`, `TLC${i}`)
      let currency = await osseus.lib.Currency.create(cc.currencyAddress, cc.marketMakerAddress, osseus.config.abi.CommunityCurrency, osseus.config.abi.MarketMaker, cc.currencyBlockchainInfo, osseus.helpers.randomStr(10))
      currencies1.push(currency)
    }

    let currencies2 = await osseus.db_models.currency.getAllCCs()
    expect(currencies2).to.be.an('array')
    expect(currencies2).to.have.lengthOf(n)
    currencies1.sort()
    currencies2.sort()
    for (let i = 0; i < n; i++) {
      validateCurrency(currencies1[i], currencies2[i])
    }
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
    osseus.agenda.purge()
  })
})
