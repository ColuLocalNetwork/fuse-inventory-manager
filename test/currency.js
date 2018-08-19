const Osseus = require('osseus')
const path = require('path')
const cwd = process.cwd()
const expect = require('chai').expect

const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const EllipseMarketMaker = artifacts.require('cln-solidity/contracts/EllipseMarketMaker.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const ColuLocalCurrency = artifacts.require('cln-solidity/contracts/ColuLocalCurrency.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

contract('CURRENCY', async (accounts) => {
  let osseus

  let cln

  let ccAddress
  let mmAddress

  const ccABI = JSON.stringify([{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwnerCandidate","type":"address"}],"name":"requestOwnershipTransfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"tokenURI","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"},{"name":"_data","type":"bytes"}],"name":"transferAndCall","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwnerCandidate","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_tokenAddress","type":"address"},{"name":"_amount","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_tokenURI","type":"string"}],"name":"setTokenURI","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_name","type":"string"},{"name":"_symbol","type":"string"},{"name":"_decimals","type":"uint8"},{"name":"_totalSupply","type":"uint256"},{"name":"_tokenURI","type":"string"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"newTokenURI","type":"string"}],"name":"TokenURIChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"by","type":"address"},{"indexed":true,"name":"to","type":"address"}],"name":"OwnershipRequested","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"data","type":"bytes"}],"name":"TransferAndCall","type":"event"}])
  const mmABI = JSON.stringify([{"constant":true,"inputs":[{"name":"token","type":"address"}],"name":"supportsToken","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwnerCandidate","type":"address"}],"name":"requestOwnershipTransfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"operational","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token2","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"mmLib","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"S2","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"S1","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PRECISION","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"R1","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_sender","type":"address"},{"name":"_value","type":"uint256"},{"name":"_data","type":"bytes"}],"name":"tokenFallback","outputs":[{"name":"ok","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwnerCandidate","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"openForPublic","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"R2","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_mmLib","type":"address"},{"name":"_token1","type":"address"},{"name":"_token2","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":false,"stateMutability":"nonpayable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"by","type":"address"},{"indexed":true,"name":"to","type":"address"}],"name":"OwnershipRequested","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"}],"name":"OwnershipTransferred","type":"event"}])

  const validateCurrency = (currency1, currency2) => {
    expect(currency1).to.be.a('Object')
    expect(currency1.id).to.be.a('string')
    if (currency2) expect(currency1.id).to.equal(currency2.id)
    expect(currency1.ccAddress).to.equal(currency2 ? currency2.ccAddress : ccAddress)
    expect(currency1.mmAddress).to.equal(currency2 ? currency2.mmAddress : mmAddress)
    expect(currency1.ccABI).to.equal(currency2 ? currency2.ccABI : ccABI)
    expect(currency1.mmABI).to.equal(currency2 ? currency2.mmABI : mmABI)
  }

  before(async function () {
    // console.log('--- before [currency] ---')
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    const currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    ccAddress = result.logs[0].args.token

    mmAddress = await currencyFactory.getMarketMakerAddressFromToken(ccAddress)

    await currencyFactory.openMarket(ccAddress)

    osseus = await Osseus.get()
    osseus.cwd = osseus.cwd || cwd
    osseus.db_models = osseus.db_models || {
      currency: require(path.join(cwd, 'modules/db/models/currency'))(osseus.mongo),
      community: require(path.join(cwd, 'modules/db/models/community'))(osseus.mongo)
    }
    osseus.lib = osseus.lib || {
      Currency: require(path.join(cwd, 'modules/lib/models/currency'))(osseus),
      Community: require(path.join(cwd, 'modules/lib/models/community'))(osseus)
    }
  })

  beforeEach(function () {
    // console.log('--- beforeEach [currency] ---')
    Object.keys(osseus.db_models).forEach(model => {
      // console.log(`model: ${model}`)
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })

  it('should create a currency', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
    validateCurrency(currency)
  })

  it('should not create a currency with same address', async () => {
    await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency).to.be.undefined
  })

  it('should get currency (by id)', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
    let currency2 = await osseus.db_models.currency.getById(currency1.id)
    validateCurrency(currency1, currency2)
  })

  it('should get currency (by cc address)', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
    let currency2 = await osseus.db_models.currency.getByCurrencyAddress(currency1.ccAddress)
    validateCurrency(currency1, currency2)
  })

  it('should get currency (by mm address)', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
    let currency2 = await osseus.db_models.currency.getByMarketMakerAddress(currency1.mmAddress)
    validateCurrency(currency1, currency2)
  })

  it('should get error if currency not found (by id)', async () => {
    let fakeId = '123abc'
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
    let currency2 = await osseus.db_models.currency.getById(fakeId).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(currency2).to.be.undefined
  })

  it('should get all currencies', async () => {
    let currency1 = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
    let currencies = await osseus.db_models.currency.getAll()
    expect(currencies).to.be.an('array')
    expect(currencies).to.have.lengthOf(1)
    validateCurrency(currency1, currencies[0])
  })

  after(async function () {
    // console.log('--- after [currency] ---')
  })
})
