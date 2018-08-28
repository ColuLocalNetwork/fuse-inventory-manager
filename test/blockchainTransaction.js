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

const validateBlockchainTranscation = (tx, from, to, type, meta) => {
  expect(tx).to.be.a('Object')
  expect(tx.id).to.be.a('String')
  expect(tx.hash).to.be.a('String')
  expect(tx.nonce).to.be.a('Number')
  expect(tx.blockHash).to.be.a('String')
  expect(tx.blockNumber).to.be.a('Number')
  expect(tx.from).to.equal(from)
  expect(tx.to).to.equal(to)
  expect(tx.type).to.equal(type)
  expect(tx.meta).to.be.a('Object')
  if (type === 'TRANSFER') {
    expect(tx.meta.from).to.equal(meta.from)
    expect(tx.meta.to).to.equal(meta.to)
    expect(tx.meta.token).to.equal(meta.token)
    expect(tx.meta.amount.toString()).to.equal(meta.amount.toString())
  } else if (type === 'CHANGE') {
    expect(tx.meta.from).to.equal(meta.from)
    expect(tx.meta.fromToken).to.equal(meta.fromToken)
    expect(tx.meta.toToken).to.equal(meta.toToken)
    expect(tx.meta.amount.toString()).to.equal(meta.amount.toString())
  }
  expect(tx.state).to.equal('TRANSMITTED')
}

contract('BLOCKCHAIN_TRANSACTION', async (accounts) => {
  let osseus

  let mmLib

  let cln

  let currencyFactory

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

    mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    ccAddress = result.logs[0].args.token
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

  describe('TRANSFER', async () => {
    it('should send some CLN from `community manager` to `community users`', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityUsersClnBalanceBefore = new BigNumber(await cln.balanceOf(communityUsersAddress))

      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cln.address,
        amount: COMMUNITY_MANAGER_CLN_BALANCE / 2
      }
      let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount)
      validateBlockchainTranscation(bctx.result, communityManagerAddress, cln.address, 'TRANSFER', data)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityUsersClnBalanceAfter = new BigNumber(await cln.balanceOf(communityUsersAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.minus(new BigNumber(data.amount)).toNumber())
      expect(communityUsersClnBalanceAfter.toNumber()).to.equal(communityUsersClnBalanceBefore.plus(new BigNumber(data.amount)).toNumber())
    })

    it('should send all CLN from `community manager` to `community users`', async () => {
      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cln.address,
        amount: COMMUNITY_MANAGER_CLN_BALANCE
      }
      let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount, {gas: 1000000})
      validateBlockchainTranscation(bctx.result, communityManagerAddress, cln.address, 'TRANSFER', data)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityUsersClnBalanceAfter = new BigNumber(await cln.balanceOf(communityUsersAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(0)
      expect(communityUsersClnBalanceAfter.toNumber()).to.equal(COMMUNITY_MANAGER_CLN_BALANCE)
    })

    it('should send some CC from `community manager` to `community users`', async () => {
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))
      let communityUsersCcBalanceBefore = new BigNumber(await cc.balanceOf(communityUsersAddress))

      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cc.address,
        amount: COMMUNITY_MANAGER_CC_BALANCE / 2
      }
      let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount)
      validateBlockchainTranscation(bctx.result, communityManagerAddress, cc.address, 'TRANSFER', data)

      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
      let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.minus(new BigNumber(data.amount)).toNumber())
      expect(communityUsersCcBalanceAfter.toNumber()).to.equal(communityUsersCcBalanceBefore.plus(new BigNumber(data.amount)).toNumber())
    })

    it('should send all CC from `community manager` to `community users`', async () => {
      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cc.address,
        amount: COMMUNITY_MANAGER_CC_BALANCE
      }
      let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount, {gas: 1000000})
      validateBlockchainTranscation(bctx.result, communityManagerAddress, cc.address, 'TRANSFER', data)

      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
      let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(0)
      expect(communityUsersCcBalanceAfter.toNumber()).to.equal(COMMUNITY_MANAGER_CC_BALANCE)
    })

    it('should not be able to send more CLNs than balance from `community manager` to `community users`', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityUsersClnBalanceBefore = new BigNumber(await cln.balanceOf(communityUsersAddress))

      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cln.address,
        amount: COMMUNITY_MANAGER_CLN_BALANCE + 1
      }
      let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount).catch(err => {
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

      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cc.address,
        amount: COMMUNITY_MANAGER_CC_BALANCE + 1
      }
      let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount).catch(err => {
        expect(err).not.to.be.undefined
      })
      expect(bctx).to.be.undefined

      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
      let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.toNumber())
      expect(communityUsersCcBalanceAfter.toNumber()).to.equal(communityUsersCcBalanceBefore.toNumber())
    })
  })

  describe('CHANGE', async () => {
    it('should be able to change CLN to CC', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))

      const data = {
        from: communityManagerAddress,
        fromToken: cln.address,
        toToken: cc.address,
        marketMaker: mm.address,
        amount: 10 * TOKEN_DECIMALS
      }
      let bctx = await osseus.lib.BlockchainTransaction.change(data.from, data.fromToken, data.toToken, data.marketMaker, data.amount, {gas: 1000000})
      validateBlockchainTranscation(bctx.result, communityManagerAddress, cln.address, 'CHANGE', data)

      let returnAmountLog = bctx.receipt.logs.filter(log => log.args.to === communityManagerAddress)[0]
      let returnAmount = returnAmountLog.args.value

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.minus(new BigNumber(data.amount)).toNumber())
      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.plus(new BigNumber(returnAmount)).toNumber())
    })

    it('should be able to change CC to CLN', async () => {
      // TODO
    })

    it('should be able to change same CLN amount couple of times in a row and get a different CC amount each time', async () => {
      // TODO
    })

    it('should be able to change same CC amount couple of times in a row and get a different CLN amount each time', async () => {
      // TODO
    })

    it('should be able to change CLN and CC back and forth', async () => {
      // TODO
    })

    it('should not be able to change more CLNs than balance to CC', async () => {
      // TODO
    })

    it('should not be able to change more CCs than balance to CLN', async () => {
      // TODO
    })
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
