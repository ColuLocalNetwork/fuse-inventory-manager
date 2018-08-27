const OsseusHelper = require('./helpers/osseus')
const BigNumber = require('bignumber.js')
const coder = require('web3-eth-abi')
const expect = require('chai').expect

const ColuLocalCurrency = artifacts.require('cln-solidity/contracts/ColuLocalCurrency.sol')
const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMaker = artifacts.require('cln-solidity/contracts/EllipseMarketMaker.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const THOUSAND_CLN = 1000 * TOKEN_DECIMALS
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

const COMMUNITY_MANAGER_ETH_BALANCE = 5 * TOKEN_DECIMALS
const COMMUNITY_MANAGER_CLN_BALANCE = THOUSAND_CLN
const COMMUNITY_MANAGER_CC_BALANCE = 2500 * TOKEN_DECIMALS

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

const validateBlockchainTranscation = (tx, from, to) => {
  expect(tx).to.be.a('Object')
  expect(tx.id).to.be.a('String')
  expect(tx.hash).to.be.a('String')
  expect(tx.nonce).to.be.a('Number')
  expect(tx.blockHash).to.be.a('String')
  expect(tx.blockNumber).to.be.a('Number')
  expect(tx.from).to.equal(from)
  expect(tx.to).to.equal(to)
  expect(tx.state).to.equal('NEW')
}

contract('BLOCKCHAIN_TRANSACTION', async (accounts) => {
  let osseus

  let cln

  let cc
  let mm

  let ccAddress
  let mmAddress

  const ccABI = JSON.stringify(require('./helpers/abi/cc'))
  const mmABI = JSON.stringify(require('./helpers/abi/mm'))

  let currency
  let community

  let communityManagerAddress
  let communityUsersAddress

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    const currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    ccAddress = result.logs[0].args.token
    cc = await ColuLocalCurrency.at(ccAddress)

    let insertCLNtoMarketMakerData = encodeInsertData(ccAddress)
    await cln.transferAndCall(currencyFactory.address, THOUSAND_CLN, insertCLNtoMarketMakerData)

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

    currency = await osseus.lib.Currency.create(ccAddress, mmAddress, ccABI, mmABI)
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

  it('should send some CLN from `community manager` to `community users`', async () => {
    let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
    let communityUsersClnBalanceBefore = new BigNumber(await cln.balanceOf(communityUsersAddress))

    let amount = COMMUNITY_MANAGER_CLN_BALANCE / 2

    let bctx = await osseus.lib.BlockchainTransaction.transfer(communityManagerAddress, communityUsersAddress, cln.address, amount)
    validateBlockchainTranscation(bctx, communityManagerAddress, cln.address)

    let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
    let communityUsersClnBalanceAfter = new BigNumber(await cln.balanceOf(communityUsersAddress))

    expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.minus(new BigNumber(amount)).toNumber())
    expect(communityUsersClnBalanceAfter.toNumber()).to.equal(communityUsersClnBalanceBefore.plus(new BigNumber(amount)).toNumber())
  })

  // it('should send all CLN from `community manager` to `community users`', async () => {
  //   let amount = COMMUNITY_MANAGER_CLN_BALANCE

  //   let bctx = await osseus.lib.BlockchainTransaction.transfer(communityManagerAddress, communityUsersAddress, cln.address, amount)
  //   validateBlockchainTranscation(bctx, communityManagerAddress, cln.address)

  //   let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
  //   let communityUsersClnBalanceAfter = new BigNumber(await cln.balanceOf(communityUsersAddress))

  //   expect(communityManagerClnBalanceAfter.toNumber()).to.equal(0)
  //   expect(communityUsersClnBalanceAfter.toNumber()).to.equal(COMMUNITY_MANAGER_CLN_BALANCE)
  // })

  it('should send some CC from `community manager` to `community users`', async () => {
    let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))
    let communityUsersCcBalanceBefore = new BigNumber(await cc.balanceOf(communityUsersAddress))

    let amount = COMMUNITY_MANAGER_CC_BALANCE / 2

    let bctx = await osseus.lib.BlockchainTransaction.transfer(communityManagerAddress, communityUsersAddress, cc.address, amount)
    validateBlockchainTranscation(bctx, communityManagerAddress, cc.address)

    let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
    let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

    expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.minus(new BigNumber(amount)).toNumber())
    expect(communityUsersCcBalanceAfter.toNumber()).to.equal(communityUsersCcBalanceBefore.plus(new BigNumber(amount)).toNumber())
  })

  // it('should send all CC from `community manager` to `community users`', async () => {
  //   let amount = COMMUNITY_MANAGER_CC_BALANCE

  //   let bctx = await osseus.lib.BlockchainTransaction.transfer(communityManagerAddress, communityUsersAddress, cc.address, amount)
  //   validateBlockchainTranscation(bctx, communityManagerAddress, cc.address)

  //   let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
  //   let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

  //   expect(communityManagerCcBalanceAfter.toNumber()).to.equal(0)
  //   expect(communityUsersCcBalanceAfter.toNumber()).to.equal(COMMUNITY_MANAGER_CC_BALANCE)
  // })

  it('should not be able to send more CLNs than balance from `community manager` to `community users`', async () => {
    let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
    let communityUsersClnBalanceBefore = new BigNumber(await cln.balanceOf(communityUsersAddress))

    let amount = COMMUNITY_MANAGER_CLN_BALANCE + 1

    let bctx = await osseus.lib.BlockchainTransaction.transfer(communityManagerAddress, communityUsersAddress, cln.address, amount).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(bctx).to.be.undefined

    let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
    let communityUsersClnBalanceAfter = new BigNumber(await cln.balanceOf(communityUsersAddress))

    expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.toNumber())
    expect(communityUsersClnBalanceAfter.toNumber()).to.equal(communityUsersClnBalanceBefore.toNumber())
  })

  it('should not be able to send more CCs than balance from `community manager` to `community users`', async () => {
    let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))
    let communityUsersCcBalanceBefore = new BigNumber(await cc.balanceOf(communityUsersAddress))

    let amount = COMMUNITY_MANAGER_CC_BALANCE + 1

    let bctx = await osseus.lib.BlockchainTransaction.transfer(communityManagerAddress, communityUsersAddress, cc.address, amount).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(bctx).to.be.undefined

    let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
    let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

    expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.toNumber())
    expect(communityUsersCcBalanceAfter.toNumber()).to.equal(communityUsersCcBalanceBefore.toNumber())
  })

  it('should not be able to send from/to unrecognized account', async () => {
    let amount = 10 * TOKEN_DECIMALS

    let bctx = await osseus.lib.BlockchainTransaction.transfer(accounts[0], accounts[1], cc.address, amount).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(bctx).to.be.undefined
  })

  it('should not be able to send unrecognized token', async () => {
    let fakeAddress = '0xB8ef4FF697Df6586b9C73412904A6AB7b8dD727E'
    let amount = 10 * TOKEN_DECIMALS

    let bctx = await osseus.lib.BlockchainTransaction.transfer(communityManagerAddress, communityUsersAddress, fakeAddress, amount).catch(err => {
      expect(err).not.to.be.undefined
    })
    expect(bctx).to.be.undefined
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
