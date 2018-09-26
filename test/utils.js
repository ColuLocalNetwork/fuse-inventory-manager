const OsseusHelper = require('./helpers/osseus')
const coder = require('web3-eth-abi')
const expect = require('chai').expect

const ColuLocalCurrency = artifacts.require('cln-solidity/contracts/ColuLocalCurrency.sol')
const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMaker = artifacts.require('cln-solidity/contracts/EllipseMarketMaker.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

const COMMUNITY_MANAGER_ETH_BALANCE = 5 * TOKEN_DECIMALS
const COMMUNITY_MANAGER_CLN_BALANCE = 100 * TOKEN_DECIMALS
const COMMUNITY_MANAGER_CC_BALANCE = 250 * TOKEN_DECIMALS

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

contract('UTILS', async (accounts) => {
  let osseus

  let mmLib

  let cln

  let currencyFactory

  let cc

  let ccAddress
  let mmAddress

  let ccMeta

  const ccABI = JSON.stringify(require('./helpers/abi/cc'))
  const mmABI = JSON.stringify(require('./helpers/abi/mm'))

  let currency
  let community

  let communityManagerAddress
  let communityUsersAddress

  before(async function () {
    this.timeout(60000)

    mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    ccAddress = result.logs[0].args.token
    ccMeta = {
      blockHash: result.logs[0].blockHash,
      blockNumber: result.logs[0].blockNumber,
      transactionHash: result.logs[0].transactionHash
    }
    cc = await ColuLocalCurrency.at(ccAddress)

    let insertCLNtoMarketMakerData = encodeInsertData(ccAddress)
    await cln.transferAndCall(currencyFactory.address, 100000 * TOKEN_DECIMALS, insertCLNtoMarketMakerData)

    await currencyFactory.openMarket(ccAddress)

    mmAddress = await currencyFactory.getMarketMakerAddressFromToken(ccAddress)
    mm = await EllipseMarketMaker.at(mmAddress)

    osseus = await OsseusHelper()
    osseus.config.cln_address = cln.address
  })

  beforeEach(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })

    currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI, ccMeta)
    community = await osseus.lib.Community.create('Test Community', currency)

    communityManagerAddress = community.wallets.filter(wallet => wallet.type === 'manager')[0].address
    communityUsersAddress = community.wallets.filter(wallet => wallet.type === 'users')[0].address

    // community manager should have ETH
    await web3.eth.sendTransaction({from: accounts[0], to: communityManagerAddress, value: COMMUNITY_MANAGER_ETH_BALANCE})

    // community manager should have CLN
    await cln.transfer(communityManagerAddress, COMMUNITY_MANAGER_CLN_BALANCE, {from: accounts[0]})

    // community manager should have CC
    await cc.transfer(communityManagerAddress, COMMUNITY_MANAGER_CC_BALANCE, {from: accounts[0]})
  })

  it('should be able to check ETH balance for existing wallet', async () => {
    let balance = await osseus.utils.checkBalance(communityManagerAddress, 'ETH')
    expect(balance).to.equal(COMMUNITY_MANAGER_ETH_BALANCE)
  })

  it('should be able to check CLN balance for existing wallet', async () => {
    let balance = await osseus.utils.checkBalance(communityManagerAddress, cln.address)
    expect(balance).to.equal(COMMUNITY_MANAGER_CLN_BALANCE)
  })

  it('should be able to check CC balance for existing wallet', async () => {
    let balance = await osseus.utils.checkBalance(communityManagerAddress, ccAddress)
    expect(balance).to.equal(COMMUNITY_MANAGER_CC_BALANCE)
  })

  it('should get error when trying to check ETH balance for non-existing wallet', async () => {
    let fakeAddress = '0x2c8187A6d6bef6B4CFB77D2ED0d06071791b732d'
    let balance = await osseus.utils.checkBalance(fakeAddress, 'ETH').catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(balance).to.be.undefined
  })

  it('should get error when trying to check CLN balance for non-existing wallet', async () => {
    let fakeAddress = '0x2c8187A6d6bef6B4CFB77D2ED0d06071791b732d'
    let balance = await osseus.utils.checkBalance(fakeAddress, cln.address).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(balance).to.be.undefined
  })

  it('should get error when trying to check CC balance for non-existing wallet', async () => {
    let fakeAddress = '0x2c8187A6d6bef6B4CFB77D2ED0d06071791b732d'
    let balance = await osseus.utils.checkBalance(fakeAddress, ccAddress).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(balance).to.be.undefined
  })

  it('should get different ETH balance for different existing wallets', async () => {
    let balance1 = await osseus.utils.checkBalance(communityManagerAddress, 'ETH')
    let balance2 = await osseus.utils.checkBalance(communityUsersAddress, 'ETH')
    expect(balance1).to.not.equal(balance2)
  })

  it('should get different CLN balance for different existing wallets', async () => {
    let balance1 = await osseus.utils.checkBalance(communityManagerAddress, cln.address)
    let balance2 = await osseus.utils.checkBalance(communityUsersAddress, cln.address)
    expect(balance1).to.not.equal(balance2)
  })

  it('should get different CC balance for different existing wallets', async () => {
    let balance1 = await osseus.utils.checkBalance(communityManagerAddress, ccAddress)
    let balance2 = await osseus.utils.checkBalance(communityUsersAddress, ccAddress)
    expect(balance1).to.not.equal(balance2)
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
