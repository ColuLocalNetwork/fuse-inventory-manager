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

  let currencyAddress

  let currencyBlockchainInfo

  const communityName = 'Test Community'

  const validateCommunity = (community1, community2, currency, communityCustomName, walletsLength, walletsPopulated) => {
    expect(community1).to.be.a('Object')
    expect(community1.id).to.be.a('string')
    if (community2) expect(community1.id).to.equal(community2.id)
    expect(community1.name).to.equal(community2 ? community2.name : (communityCustomName || communityName))
    expect(community1.wallets).to.be.an('array')
    expect(community1.wallets).to.have.lengthOf(walletsLength || 3)
    expect(community1.mnemonic).to.be.a('string')
    if (community2) expect(community1.mnemonic).to.equal(community2.mnemonic)
    expect(community1.uuid).to.be.a('string')
    if (community2) expect(community1.uuid).to.equal(community2.uuid)
    expect(community1.defaultCurrency.toString()).to.equal(community2 ? community2.defaultCurrency.toString() : currency.id)
    expect(community1.exid).to.be.a('string')
    if (community2) expect(community1.exid).to.equal(community2.exid)
    walletsPopulated && community1.wallets.forEach(wallet => {
      if (!walletsLength) expect(['manager', 'users', 'merchants']).to.contain(wallet.type)
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
    currencyAddress = result.logs[0].args.token
    currencyBlockchainInfo = {
      blockHash: result.logs[0].blockHash,
      blockNumber: result.logs[0].blockNumber,
      transactionHash: result.logs[0].transactionHash
    }

    await currencyFactory.openMarket(currencyAddress)

    osseus = await OsseusHelper()
  })

  beforeEach(function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })

  it('should create a community (with default wallets)', async () => {
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let community = await osseus.lib.Community.create(communityName, currency.id, osseus.helpers.randomStr(10))
    validateCommunity(community, undefined, currency, undefined, undefined, true)
  })

  it('should create a community (with pre-defined wallets)', async () => {
    let wallets = [{type: 'manager', exid: osseus.helpers.randomStr(10)}]
    for (var i = 1; i < osseus.helpers.randomNum(100); i++) {
      wallets.push({type: `user ${i}`, exid: osseus.helpers.randomStr(10)})
    }
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let community = await osseus.lib.Community.create(communityName, currency.id, osseus.helpers.randomStr(10), wallets)
    validateCommunity(community, undefined, currency, undefined, wallets.length, true)
  })

  it('should get error if trying to create community without manager wallet', async () => {
    let wallets = []
    for (var i = 1; i < osseus.helpers.randomNum(100); i++) {
      wallets.push({type: `user ${i}`, exid: osseus.helpers.randomStr(10)})
    }
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let community = await osseus.lib.Community.create(communityName, currency.id, osseus.helpers.randomStr(10), wallets).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(community).to.be.undefined
  })

  it('should get community (by id)', async () => {
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let community1 = await osseus.lib.Community.create(communityName, currency.id, osseus.helpers.randomStr(10))
    let community2 = await osseus.db_models.community.getById(community1.id)
    let community3 = await osseus.db_models.community.getByIdPopulated(community1.id)
    validateCommunity(community1, community2, currency, undefined, undefined, true)
    validateCommunity(community1, community3, currency)
  })

  it('should get community (by name)', async () => {
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let community1 = await osseus.lib.Community.create(communityName, currency.id, osseus.helpers.randomStr(10))
    let community2 = await osseus.db_models.community.getByName(communityName)
    validateCommunity(community1, community2, currency, undefined, undefined, true)
  })

  it('should get community (by wallet address)', async () => {
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let community1 = await osseus.lib.Community.create(communityName, currency.id, osseus.helpers.randomStr(10))
    let community2 = await osseus.db_models.community.getByWalletAddress(community1.wallets[0].address)
    validateCommunity(community1, community2, currency, undefined, undefined, true)

    let community3 = await osseus.db_models.community.getByWalletAddress(community1.wallets[1].address)
    validateCommunity(community1, community3, currency, undefined, undefined, true)

    let community4 = await osseus.db_models.community.getByWalletAddress(community1.wallets[2].address)
    validateCommunity(community1, community4, currency, undefined, undefined, true)
  })

  it('should get error if community not found (by id)', async () => {
    let fakeId = '123abc'
    let currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    let community1 = await osseus.lib.Community.create(communityName, currency.id, osseus.helpers.randomStr(10))
    validateCommunity(community1, undefined, currency, undefined, undefined, true)
    let community2 = await osseus.db_models.community.getById(fakeId).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(community2).to.be.undefined
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
