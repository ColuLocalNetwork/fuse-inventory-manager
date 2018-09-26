const OsseusHelper = require('./helpers/osseus')
const expect = require('chai').expect

const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

contract('COMMUNITY', async (accounts) => {
  let osseus

  let cln

  let ccAddress
  let mmAddress

  let ccMeta

  const ccABI = JSON.stringify(require('./helpers/abi/cc'))
  const mmABI = JSON.stringify(require('./helpers/abi/mm'))

  const communityName = 'Test Community'

  const validateCommunity = (community1, community2, currency, communityCustomName) => {
    expect(community1).to.be.a('Object')
    expect(community1.id).to.be.a('string')
    if (community2) expect(community1.id).to.equal(community2.id)
    expect(community1.name).to.equal(community2 ? community2.name : (communityCustomName || communityName))
    expect(community1.wallets).to.be.an('array')
    expect(community1.wallets).to.have.lengthOf(3)
    expect(community1.mnemonic).to.be.a('string')
    expect(community1.defaultCurrency.toString()).to.equal(community2 ? community2.defaultCurrency.toString() : currency.id)
    community1.wallets.forEach(wallet => {
      expect(['manager', 'users', 'merchants']).to.contain(wallet.type)
      expect(wallet.address).to.be.a('string')
      expect(wallet.index).to.be.a('number')
      expect(wallet.balances).to.be.an('array')
      expect(wallet.balances).to.have.lengthOf(1)
      expect(wallet.balances[0].currency.toString()).to.equal(community2 ? community2.defaultCurrency.toString() : currency.id)
      expect(wallet.balances[0].blockchainAmount.toNumber()).to.equal(0)
      expect(wallet.balances[0].offchainAmount.toNumber()).to.equal(0)
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
    ccMeta = {
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

  it('should create a community', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccMeta)
    let community = await osseus.lib.Community.create(communityName, currency.id)
    validateCommunity(community, undefined, currency)
  })

  it('should get community (by id)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccMeta)
    let community1 = await osseus.lib.Community.create(communityName, currency.id)
    let community2 = await osseus.db_models.community.getById(community1.id)
    validateCommunity(community1, community2, currency)
  })

  it('should get community (by name)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccMeta)
    let community1 = await osseus.lib.Community.create(communityName, currency.id)
    let community2 = await osseus.db_models.community.getByName(communityName)
    validateCommunity(community1, community2, currency)
  })

  it('should get community (by wallet address)', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccMeta)
    let community1 = await osseus.lib.Community.create(communityName, currency.id)
    let community2 = await osseus.db_models.community.getByWalletAddress(community1.wallets[0].address)
    validateCommunity(community1, community2, currency)

    let community3 = await osseus.db_models.community.getByWalletAddress(community1.wallets[1].address)
    validateCommunity(community1, community3, currency)

    let community4 = await osseus.db_models.community.getByWalletAddress(community1.wallets[2].address)
    validateCommunity(community1, community4, currency)
  })

  it('should get error if community not found (by id)', async () => {
    let fakeId = '123abc'
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccMeta)
    let community1 = await osseus.lib.Community.create(communityName, currency.id)
    validateCommunity(community1, undefined, currency)
    let community2 = await osseus.db_models.community.getById(fakeId).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(community2).to.be.undefined
  })

  it('should get all communities', async () => {
    let currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccMeta)
    let community1 = await osseus.lib.Community.create(`${communityName} #1`, currency.id)
    let community2 = await osseus.lib.Community.create(`${communityName} #2`, currency.id)
    let community3 = await osseus.lib.Community.create(`${communityName} #3`, currency.id)
    let communities = await osseus.db_models.community.getAll()
    expect(communities).to.be.an('array')
    expect(communities).to.have.lengthOf(3)
    validateCommunity(communities[0], community1, currency, `${communityName} #1`)
    validateCommunity(communities[1], community2, currency, `${communityName} #2`)
    validateCommunity(communities[2], community3, currency, `${communityName} #3`)
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
