const OsseusHelper = require('./helpers/osseus')
const coder = require('web3-eth-abi')
const expect = require('chai').expect

const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMaker = artifacts.require('cln-solidity/contracts/EllipseMarketMaker.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

const encodeInsertData = (toToken) => {
  const abi = {
    name: 'insertCLNtoMarketMaker',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'token'
    }],
    outputs: [
      {
        type: 'bool',
        name: 'success'
      }
    ]
  }
  const params = [toToken]
  return coder.encodeFunctionCall(abi, params)
}

contract.only('MARKET_MAKER', async (accounts) => {
  let osseus

  let cln

  let cc

  let mm

  const validateMarketMaker = (marketMaker1, marketMaker2) => {
    expect(marketMaker1).to.be.a('Object')
    expect(marketMaker1.id).to.be.a('string')
    if (marketMaker2) expect(marketMaker1.id).to.equal(marketMaker2.id)
    expect(marketMaker1.address).to.be.a('string')
    expect(marketMaker1.address).to.equal(marketMaker2 ? marketMaker2.address : mm.address)
    expect(marketMaker1.abi).to.equal(marketMaker2 ? marketMaker2.abi : osseus.config.abi.MarketMaker)
    expect(marketMaker1.tokenAddress1).to.be.a('string')
    expect(marketMaker1.tokenAddress1).to.equal(marketMaker2 ? marketMaker2.tokenAddress1 : cln.address)
    expect(marketMaker1.tokenAddress2).to.be.a('string')
    expect(marketMaker1.tokenAddress2).to.equal(marketMaker2 ? marketMaker2.tokenAddress2 : cc.address)
  }

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    const currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    const currencyAddress = result.logs[0].args.token

    const insertCLNtoMarketMakerData = encodeInsertData(currencyAddress)
    await cln.transferAndCall(currencyFactory.address, 100000 * TOKEN_DECIMALS, insertCLNtoMarketMakerData)

    await currencyFactory.openMarket(currencyAddress)

    const marketMakerAddress = await currencyFactory.getMarketMakerAddressFromToken(currencyAddress)
    mm = await EllipseMarketMaker.at(marketMakerAddress)

    osseus = await OsseusHelper()

    cc = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, {blockHash: result.logs[0].blockHash, blockNumber: result.logs[0].blockNumber, transactionHash: result.logs[0].transactionHash}, osseus.helpers.randomStr(10))
  })

  beforeEach(function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })

  it('should create a market maker', async () => {
    let marketMaker = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, cln.address, cc.address)
    validateMarketMaker(marketMaker)
  })

  it('should not create a market maker with same address', async () => {
    await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, 'tokenAddress1', 'tokenAddress2')
    let marketMaker = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, 'tokenAddress2', 'tokenAddress1').catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(marketMaker).to.be.undefined
  })

  it('should not create a market maker with same pair of currencies', async () => {
    await osseus.lib.MarketMaker.create('address1', osseus.config.abi.MarketMaker, cln.address, cc.address)
    let marketMaker = await osseus.lib.MarketMaker.create('address2', osseus.config.abi.MarketMaker, cln.address, cc.address).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(marketMaker).to.be.undefined
  })

  it('should get market maker (by id)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, cln.address, cc.address)
    let marketMaker2 = await osseus.db_models.marketMaker.getById(marketMaker1.id)
    validateMarketMaker(marketMaker1, marketMaker2)
  })

  it('should get market maker (by address)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, cln.address, cc.address)
    let marketMaker2 = await osseus.db_models.marketMaker.getByAddress(marketMaker1.address)
    validateMarketMaker(marketMaker1, marketMaker2)
  })

  it('should get market maker (by pair of currencies)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, cln.address, cc.address)
    let marketMaker2 = await osseus.db_models.marketMaker.getByPair(marketMaker1.tokenAddress1, marketMaker1.tokenAddress2)
    validateMarketMaker(marketMaker1, marketMaker2)
  })

  it('should get error if market maker not found (by id)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, cln.address, cc.address)
    validateMarketMaker(marketMaker1)
    let marketMaker2 = await osseus.db_models.marketMaker.getById('fakeId').catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(marketMaker2).to.be.undefined
  })

  it('should get error if market maker not found (by address)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, cln.address, cc.address)
    validateMarketMaker(marketMaker1)
    let marketMaker2 = await osseus.db_models.marketMaker.getByAddress('fakeAddress').catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(marketMaker2).to.be.undefined
  })

  it('should get error if market maker not found (by pair of currencies)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, cln.address, cc.address)
    validateMarketMaker(marketMaker1)
    let marketMaker2 = await osseus.db_models.marketMaker.getByPair('fakeTokenAddress1', 'fakeTokenAddress2').catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(marketMaker2).to.be.undefined
  })

  it('should update market maker (address)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create('fakeAddress', osseus.config.abi.MarketMaker, cln.address, cc.address)
    let marketMaker2 = await osseus.db_models.marketMaker.update({_id: marketMaker1.id}, {address: mm.address})
    expect(marketMaker2.address).to.equal(mm.address)
  })

  it('should update market maker (one of the currencies)', async () => {
    let marketMaker1 = await osseus.lib.MarketMaker.create(mm.address, osseus.config.abi.MarketMaker, 'fakeTokenAddress1', 'fakeTokenAddress2')
    let marketMaker2 = await osseus.db_models.marketMaker.update({_id: marketMaker1.id}, {tokenAddress1: cln.address, tokenAddress2: cc.address})
    expect(marketMaker2.tokenAddress1).to.equal(cln.address)
    expect(marketMaker2.tokenAddress2).to.equal(cc.address)
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
