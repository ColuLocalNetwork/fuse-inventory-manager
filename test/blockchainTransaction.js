const OsseusHelper = require('./helpers/osseus')
const BigNumber = require('bignumber.js')
const coder = require('web3-eth-abi')
const expect = require('chai').expect
const Promise = require('bluebird')

const ColuLocalCurrency = artifacts.require('cln-solidity/contracts/ColuLocalCurrency.sol')
const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMaker = artifacts.require('cln-solidity/contracts/EllipseMarketMaker.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

const COMMUNITY_MANAGER_ETH_BALANCE = 1 * TOKEN_DECIMALS
const COMMUNITY_MANAGER_CLN_BALANCE = 100 * TOKEN_DECIMALS
const COMMUNITY_MANAGER_CC_BALANCE = 250 * TOKEN_DECIMALS

const A_LOT_OF_TXS = process.env.A_LOT_OF_TXS || 0

const delay = (ms) => new Promise(resolve => setTimeout(() => resolve(ms), ms))

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

  let currencyAddress
  let marketMakerAddress

  let clnBlockchainInfo
  let currencyBlockchainInfo

  let currency
  let community

  let communityManagerAddress
  let communityUsersAddress

  let nonce

  before(async function () {
    this.timeout(60000)

    mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    const clnCreationBlock = await web3.eth.getTransaction(cln.transactionHash)
    clnBlockchainInfo = {
      blockHash: clnCreationBlock.blockHash,
      blockNumber: clnCreationBlock.blockNumber,
      transactionHash: cln.transactionHash
    }
    await cln.makeTokensTransferable()

    currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    currencyAddress = result.logs[0].args.token
    currencyBlockchainInfo = {
      blockHash: result.logs[0].blockHash,
      blockNumber: result.logs[0].blockNumber,
      transactionHash: result.logs[0].transactionHash
    }
    cc = await ColuLocalCurrency.at(currencyAddress)

    let insertCLNtoMarketMakerData = encodeInsertData(currencyAddress)
    await cln.transferAndCall(currencyFactory.address, 100000 * TOKEN_DECIMALS, insertCLNtoMarketMakerData)

    await currencyFactory.openMarket(currencyAddress)

    marketMakerAddress = await currencyFactory.getMarketMakerAddressFromToken(currencyAddress)
    mm = await EllipseMarketMaker.at(marketMakerAddress)

    osseus = await OsseusHelper()
    osseus.config.cln_address = cln.address
  })

  beforeEach(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })

    await osseus.lib.Currency.createCLN(cln.address, osseus.abi.cln, clnBlockchainInfo, osseus.helpers.randomStr(10))
    currency = await osseus.lib.Currency.create(currencyAddress, marketMakerAddress, osseus.abi.cc, osseus.abi.mm, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    community = await osseus.lib.Community.create('Test Community', currency, osseus.helpers.randomStr(10))

    communityManagerAddress = community.wallets.filter(wallet => wallet.type === 'manager')[0].address
    communityUsersAddress = community.wallets.filter(wallet => wallet.type === 'users')[0].address

    // community manager should have ETH
    await web3.eth.sendTransaction({from: accounts[0], to: communityManagerAddress, value: COMMUNITY_MANAGER_ETH_BALANCE})

    // community manager should have CLN
    await cln.transfer(communityManagerAddress, COMMUNITY_MANAGER_CLN_BALANCE, {from: accounts[0]})

    // community manager should have CC
    await cc.transfer(communityManagerAddress, COMMUNITY_MANAGER_CC_BALANCE, {from: accounts[0]})

    nonce = 0
  })

  describe('TRANSFER', async () => {
    const transfer = async (data, shouldFail) => {
      let bctx

      if (shouldFail) {
        bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount).catch(err => {
          expect(err).not.to.be.undefined
        })
        expect(bctx).to.be.undefined
      } else {
        bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount, data.opts)
        validateBlockchainTranscation(bctx.result, data.from, data.token, 'TRANSFER', data)
      }
      return bctx
    }

    it('should send some CLN from `community manager` to `community users`', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityUsersClnBalanceBefore = new BigNumber(await cln.balanceOf(communityUsersAddress))

      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cln.address,
        amount: communityManagerClnBalanceBefore.div(2)
      }

      await transfer(data)

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
        amount: COMMUNITY_MANAGER_CLN_BALANCE,
        opts: {gas: 1000000}
      }

      await transfer(data)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityUsersClnBalanceAfter = new BigNumber(await cln.balanceOf(communityUsersAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(0)
      expect(communityUsersClnBalanceAfter.toNumber()).to.equal(data.amount)
    })

    it('should send some CC from `community manager` to `community users`', async () => {
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))
      let communityUsersCcBalanceBefore = new BigNumber(await cc.balanceOf(communityUsersAddress))

      const data = {
        from: communityManagerAddress,
        to: communityUsersAddress,
        token: cc.address,
        amount: communityManagerCcBalanceBefore.div(2)
      }

      await transfer(data)

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
        amount: COMMUNITY_MANAGER_CC_BALANCE,
        opts: {gas: 1000000}
      }

      await transfer(data)

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
        amount: communityManagerClnBalanceBefore.plus(1)
      }

      await transfer(data, true)

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
        amount: communityManagerCcBalanceBefore.plus(1)
      }

      await transfer(data, true)

      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
      let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.toNumber())
      expect(communityUsersCcBalanceAfter.toNumber()).to.equal(communityUsersCcBalanceBefore.toNumber())
    })

    describe(`A LOT (${A_LOT_OF_TXS})`, async () => {
      it('should make a lot of successful tranasctions', async () => {
        const generateTransactions = (n) => {
          const txs = []
          for (let i = 0; i < n; i++) {
            let from = communityManagerAddress
            let to = communityUsersAddress
            let token = [cln.address, cc.address][osseus.helpers.randomNum(2)]
            let amount = 1 * TOKEN_DECIMALS
            txs.push({from: from, to: to, token: token, amount: amount, opts: {nonce: nonce}})
            nonce += 1
          }
          return txs
        }

        const makeTransactionAndValidate = (data) => {
          osseus.logger.debug(`makeTransactionAndValidate: ${JSON.stringify(data)}`)
          return new Promise(async (resolve, reject) => {
            try {
              await delay(1000)

              let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
              let communityUsersClnBalanceBefore = new BigNumber(await cln.balanceOf(communityUsersAddress))
              let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))
              let communityUsersCcBalanceBefore = new BigNumber(await cc.balanceOf(communityUsersAddress))

              let tx = await transfer(data)
              let clnAmountTransferred = new BigNumber(data.token === cln.address ? data.amount : 0)
              let ccAmountTransferred = new BigNumber(data.token === cc.address ? data.amount : 0)

              let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
              let communityUsersClnBalanceAfter = new BigNumber(await cln.balanceOf(communityUsersAddress))
              let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))
              let communityUsersCcBalanceAfter = new BigNumber(await cc.balanceOf(communityUsersAddress))

              expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.minus(clnAmountTransferred).toNumber())
              expect(communityUsersClnBalanceAfter.toNumber()).to.equal(communityUsersClnBalanceBefore.plus(clnAmountTransferred).toNumber())
              expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.minus(ccAmountTransferred).toNumber())
              expect(communityUsersCcBalanceAfter.toNumber()).to.equal(communityUsersCcBalanceBefore.plus(ccAmountTransferred).toNumber())

              resolve(tx)
            } catch (err) {
              reject(err)
            }
          })
        }

        const txs = generateTransactions(A_LOT_OF_TXS)

        let results = await Promise.mapSeries(txs, tx => { return makeTransactionAndValidate(tx) })
        expect(results).to.have.lengthOf(A_LOT_OF_TXS)
        results.forEach(result => {
          expect(result).not.to.be.undefined
        })
      })
    })
  })

  describe('CHANGE', async () => {
    const change = async (data, shouldFail) => {
      let bctx
      let opts = data.opts || {}
      opts.gas = 1000000

      if (shouldFail) {
        bctx = await osseus.lib.BlockchainTransaction.change(data.from, data.fromToken, data.toToken, data.marketMaker, data.amount, opts).catch(err => {
          expect(err).not.to.be.undefined
        })
        expect(bctx).to.be.undefined
      } else {
        bctx = await osseus.lib.BlockchainTransaction.change(data.from, data.fromToken, data.toToken, data.marketMaker, data.amount, opts)
        validateBlockchainTranscation(bctx.result, data.from, data.fromToken, 'CHANGE', data)
        let returnAmount = bctx.receipt.logs.filter(log => log.args.to === data.from)[0].args.value
        return returnAmount
      }
    }

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

      let returnAmount = await change(data)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.minus(new BigNumber(data.amount)).toNumber())
      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.plus(new BigNumber(returnAmount)).toNumber())
    })

    it('should be able to change CC to CLN', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))

      const data = {
        from: communityManagerAddress,
        fromToken: cc.address,
        toToken: cln.address,
        marketMaker: mm.address,
        amount: 10 * TOKEN_DECIMALS
      }

      let returnAmount = await change(data)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.plus(new BigNumber(returnAmount)).toNumber())
      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.minus(new BigNumber(data.amount)).toNumber())
    })

    it('should be able to change same CLN amount couple of times and get a different CC amount each time', async () => {
      let communityManagerClnBalanceInitial = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceInitial = new BigNumber(await cc.balanceOf(communityManagerAddress))
      const data = {
        from: communityManagerAddress,
        fromToken: cln.address,
        toToken: cc.address,
        marketMaker: mm.address,
        amount: 10 * TOKEN_DECIMALS
      }

      // make 1st change
      let returnAmount1 = await change(data)

      let communityManagerClnBalanceAfter1 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter1 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter1.toNumber()).to.equal(communityManagerClnBalanceInitial.minus(new BigNumber(data.amount)).toNumber())
      expect(communityManagerCcBalanceAfter1.toNumber()).to.equal(communityManagerCcBalanceInitial.plus(new BigNumber(returnAmount1)).toNumber())

      // make 2nd change
      let returnAmount2 = await change(data)

      let communityManagerClnBalanceAfter2 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter2 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter2.toNumber()).to.equal(communityManagerClnBalanceAfter1.minus(new BigNumber(data.amount)).toNumber())
      expect(communityManagerCcBalanceAfter2.toNumber()).to.equal(communityManagerCcBalanceAfter1.plus(new BigNumber(returnAmount2)).toNumber())

      expect(returnAmount2.toNumber()).to.not.equal(returnAmount1.toNumber())

      // make 3rd change
      let returnAmount3 = await change(data)

      let communityManagerClnBalanceAfter3 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter3 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter3.toNumber()).to.equal(communityManagerClnBalanceAfter2.minus(new BigNumber(data.amount)).toNumber())
      expect(communityManagerCcBalanceAfter3.toNumber()).to.equal(communityManagerCcBalanceAfter2.plus(new BigNumber(returnAmount3)).toNumber())

      expect(returnAmount3.toNumber()).to.not.equal(returnAmount2.toNumber())

      // price of CCs should go up - meaning each change less CCs will return for same CLN amount
      expect(returnAmount1.toNumber()).to.be.above(returnAmount2.toNumber())
      expect(returnAmount2.toNumber()).to.be.above(returnAmount3.toNumber())
    })

    it('should be able to change same CC amount couple of times and get a different CLN amount each time', async () => {
      let communityManagerClnBalanceInitial = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceInitial = new BigNumber(await cc.balanceOf(communityManagerAddress))
      const data = {
        from: communityManagerAddress,
        fromToken: cc.address,
        toToken: cln.address,
        marketMaker: mm.address,
        amount: 10 * TOKEN_DECIMALS
      }

      // make 1st change
      let returnAmount1 = await change(data)

      let communityManagerClnBalanceAfter1 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter1 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter1.toNumber()).to.equal(communityManagerClnBalanceInitial.plus(new BigNumber(returnAmount1)).toNumber())
      expect(communityManagerCcBalanceAfter1.toNumber()).to.equal(communityManagerCcBalanceInitial.minus(new BigNumber(data.amount)).toNumber())

      // make 2nd change
      let returnAmount2 = await change(data)

      let communityManagerClnBalanceAfter2 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter2 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter2.toNumber()).to.equal(communityManagerClnBalanceAfter1.plus(new BigNumber(returnAmount2)).toNumber())
      expect(communityManagerCcBalanceAfter2.toNumber()).to.equal(communityManagerCcBalanceAfter1.minus(new BigNumber(data.amount)).toNumber())

      expect(returnAmount2.toNumber()).to.not.equal(returnAmount1.toNumber())

      // make 3rd change
      let returnAmount3 = await change(data)

      let communityManagerClnBalanceAfter3 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter3 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter3.toNumber()).to.equal(communityManagerClnBalanceAfter2.plus(new BigNumber(returnAmount3)).toNumber())
      expect(communityManagerCcBalanceAfter3.toNumber()).to.equal(communityManagerCcBalanceAfter2.minus(new BigNumber(data.amount)).toNumber())

      expect(returnAmount3.toNumber()).to.not.equal(returnAmount2.toNumber())

      // price of CCs should go down - meaning each change less CLNs will return for same CC amount
      expect(returnAmount1.toNumber()).to.be.above(returnAmount2.toNumber())
      expect(returnAmount2.toNumber()).to.be.above(returnAmount3.toNumber())
    })

    it('should be able to change CLN and CC back and forth and the price should alter', async () => {
      let communityManagerClnBalanceInitial = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceInitial = new BigNumber(await cc.balanceOf(communityManagerAddress))

      const data = {
        clnToCC: {
          from: communityManagerAddress,
          fromToken: cln.address,
          toToken: cc.address,
          marketMaker: mm.address,
          amount: 10 * TOKEN_DECIMALS
        },
        ccToCLN: {
          from: communityManagerAddress,
          fromToken: cc.address,
          toToken: cln.address,
          marketMaker: mm.address,
          amount: 10 * TOKEN_DECIMALS
        }
      }

      // make 1st change - CLN to CC
      let returnAmount1 = await change(data.clnToCC)

      let communityManagerClnBalanceAfter1 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter1 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter1.toNumber()).to.equal(communityManagerClnBalanceInitial.minus(new BigNumber(data.clnToCC.amount)).toNumber())
      expect(communityManagerCcBalanceAfter1.toNumber()).to.equal(communityManagerCcBalanceInitial.plus(new BigNumber(returnAmount1)).toNumber())

      // make 2nd change - CC to CLN
      let returnAmount2 = await change(data.ccToCLN)

      let communityManagerClnBalanceAfter2 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter2 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter2.toNumber()).to.equal(communityManagerClnBalanceAfter1.plus(new BigNumber(returnAmount2)).toNumber())
      expect(communityManagerCcBalanceAfter2.toNumber()).to.equal(communityManagerCcBalanceAfter1.minus(new BigNumber(data.ccToCLN.amount)).toNumber())

      expect(returnAmount2.toNumber()).to.not.equal(returnAmount1.toNumber())

      // make 3rd change - CLN to CC
      let returnAmount3 = await change(data.clnToCC)

      let communityManagerClnBalanceAfter3 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter3 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter3.toNumber()).to.equal(communityManagerClnBalanceAfter2.minus(new BigNumber(data.clnToCC.amount)).toNumber())
      expect(communityManagerCcBalanceAfter3.toNumber()).to.equal(communityManagerCcBalanceAfter2.plus(new BigNumber(returnAmount3)).toNumber())

      expect(returnAmount3.toNumber()).to.not.equal(returnAmount1.toNumber())
      expect(returnAmount3.toNumber()).to.not.equal(returnAmount2.toNumber())

      // make 4th change - CC to CLN
      let returnAmount4 = await change(data.ccToCLN)

      let communityManagerClnBalanceAfter4 = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter4 = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter4.toNumber()).to.equal(communityManagerClnBalanceAfter3.plus(new BigNumber(returnAmount4)).toNumber())
      expect(communityManagerCcBalanceAfter4.toNumber()).to.equal(communityManagerCcBalanceAfter3.minus(new BigNumber(data.ccToCLN.amount)).toNumber())

      expect(returnAmount4.toNumber()).to.not.equal(returnAmount1.toNumber())
      expect(returnAmount4.toNumber()).to.not.equal(returnAmount2.toNumber())
      expect(returnAmount4.toNumber()).to.not.equal(returnAmount3.toNumber())
    })

    it('should not be able to change the same token', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))

      const data = {
        from: communityManagerAddress,
        fromToken: cln.address,
        toToken: cln.address,
        marketMaker: mm.address,
        amount: 10 * TOKEN_DECIMALS
      }

      await change(data, true)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.toNumber())
      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.toNumber())
    })

    it('should not be able to change an unsupported token', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))
      let fakeToken = '0xD352492eBEB9Fad92147a3719766D7Afe38fe26E'

      const data = {
        from: communityManagerAddress,
        fromToken: cln.address,
        toToken: fakeToken,
        marketMaker: mm.address,
        amount: 10 * TOKEN_DECIMALS
      }

      await change(data, true)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.toNumber())
      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.toNumber())
    })

    it('should not be able to change more CLNs than balance to CC', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))

      const data = {
        from: communityManagerAddress,
        fromToken: cln.address,
        toToken: cc.address,
        marketMaker: mm.address,
        amount: communityManagerClnBalanceBefore.plus(1)
      }

      await change(data, true)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.toNumber())
      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.toNumber())
    })

    it('should not be able to change more CCs than balance to CLN', async () => {
      let communityManagerClnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))

      const data = {
        from: communityManagerAddress,
        fromToken: cc.address,
        toToken: cln.address,
        marketMaker: mm.address,
        amount: communityManagerCcBalanceBefore.plus(1)
      }

      await change(data, true)

      let communityManagerClnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
      let communityManagerCcBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

      expect(communityManagerClnBalanceAfter.toNumber()).to.equal(communityManagerClnBalanceBefore.toNumber())
      expect(communityManagerCcBalanceAfter.toNumber()).to.equal(communityManagerCcBalanceBefore.toNumber())
    })

    describe(`A LOT (${A_LOT_OF_TXS})`, async () => {
      it('should make a lot of successful tranasctions', async () => {
        const generateTransactions = (n) => {
          const txs = []
          for (let i = 0; i < n; i++) {
            let from = communityManagerAddress
            let r = osseus.helpers.randomNum(2)
            let fromToken = [cln.address, cc.address][r]
            let toToken = [cln.address, cc.address][1 - r]
            let marketMaker = mm.address
            let amount = 1 * TOKEN_DECIMALS
            txs.push({from: from, fromToken: fromToken, toToken: toToken, marketMaker: marketMaker, amount: amount, opts: {nonce: nonce}})
            nonce += 1
          }
          return txs
        }

        const makeTransactionAndValidate = (data) => {
          osseus.logger.debug(`makeTransactionAndValidate: ${JSON.stringify(data)}`)
          return new Promise(async (resolve, reject) => {
            try {
              await delay(1000)

              let clnBalanceBefore = new BigNumber(await cln.balanceOf(communityManagerAddress))
              let ccBalanceBefore = new BigNumber(await cc.balanceOf(communityManagerAddress))

              let returnAmount = await change(data)

              let clnBalanceAfter = new BigNumber(await cln.balanceOf(communityManagerAddress))
              let ccBalanceAfter = new BigNumber(await cc.balanceOf(communityManagerAddress))

              if (data.fromToken === cln.address && data.toToken === cc.address) {
                // CLN to CC
                expect(clnBalanceAfter.toNumber()).to.equal(clnBalanceBefore.minus(new BigNumber(data.amount)).toNumber())
                expect(ccBalanceAfter.toNumber()).to.equal(ccBalanceBefore.plus(new BigNumber(returnAmount)).toNumber())
              } else {
                // CC to CLN
                expect(clnBalanceAfter.toNumber()).to.equal(clnBalanceBefore.plus(new BigNumber(returnAmount)).toNumber())
                expect(ccBalanceAfter.toNumber()).to.equal(ccBalanceBefore.minus(new BigNumber(data.amount)).toNumber())
              }

              resolve(returnAmount)
            } catch (err) {
              reject(err)
            }
          })
        }

        const txs = generateTransactions(A_LOT_OF_TXS)

        let results = await Promise.mapSeries(txs, tx => { return makeTransactionAndValidate(tx) })
        expect(results).to.have.lengthOf(A_LOT_OF_TXS)
        results.forEach(result => {
          expect(result).not.to.be.undefined
        })
      })
    })
  })

  describe('SYNC', () => {
    const makeSomeTransferTransactions = async (n) => {
      const transfer = async (data) => {
        let bctx = await osseus.lib.BlockchainTransaction.transfer(data.from, data.to, data.token, data.amount, data.opts)
        validateBlockchainTranscation(bctx.result, data.from, data.token, 'TRANSFER', data)
        return bctx
      }

      const generateTransactions = (n) => {
        const txs = []
        for (let i = 0; i < n; i++) {
          let from = communityManagerAddress
          let to = communityUsersAddress
          let token = [cln.address, cc.address][osseus.helpers.randomNum(2)]
          let amount = 1 * TOKEN_DECIMALS
          txs.push({from: from, to: to, token: token, amount: amount, opts: {nonce: nonce}})
          nonce += 1
        }
        return txs
      }

      const makeTransaction = async (data) => {
        await delay(1000)
        let tx = await transfer(data)
        return tx
      }

      const txs = generateTransactions(n)
      const results = await Promise.mapSeries(txs, tx => { return makeTransaction(tx) })
      return results
    }

    const makeSomeChangeTransactions = async (n) => {
      const change = async (data) => {
        let opts = data.opts || {}
        opts.gas = 1000000

        let bctx = await osseus.lib.BlockchainTransaction.change(data.from, data.fromToken, data.toToken, data.marketMaker, data.amount, opts)
        validateBlockchainTranscation(bctx.result, data.from, data.fromToken, 'CHANGE', data)
        // let returnAmount = bctx.receipt.logs.filter(log => log.args.to === data.from)[0].args.value
        return bctx
      }

      const generateTransactions = (n) => {
        const txs = []
        for (let i = 0; i < n; i++) {
          let from = communityManagerAddress
          let r = osseus.helpers.randomNum(2)
          let fromToken = [cln.address, cc.address][r]
          let toToken = [cln.address, cc.address][1 - r]
          let marketMaker = mm.address
          let amount = 1 * TOKEN_DECIMALS
          txs.push({from: from, fromToken: fromToken, toToken: toToken, marketMaker: marketMaker, amount: amount, opts: {nonce: nonce}})
          nonce += 1
        }
        return txs
      }

      const makeTransaction = async (data) => {
        await delay(1000)
        let returnAmount = await change(data)
        return returnAmount
      }

      const txs = generateTransactions(n)
      const results = await Promise.mapSeries(txs, tx => { return makeTransaction(tx) })
      return results
    }

    it('should make some successful tranasctions (transfers and changes) and be able to update their state accordingly', async () => {
      const transferTxs = await makeSomeTransferTransactions(osseus.helpers.randomNum(10) + 1)
      const changeTxs = await makeSomeChangeTransactions(osseus.helpers.randomNum(10) + 1)

      const updatedTxs = await osseus.lib.BlockchainTransaction.syncState()
      expect(updatedTxs).to.have.lengthOf(transferTxs.length + changeTxs.length)
      updatedTxs.forEach(tx => {
        expect(tx.state).to.equal('CONFIRMED')
        expect(tx.blockHash).not.to.be.undefined
        expect(tx.blockNumber).not.to.be.undefined
      })
    })

    it('should make some successful tranasctions (transfers and changes) and be able to update their state accordingly (using address & type filters)', async () => {
      const transferTxs = await makeSomeTransferTransactions(osseus.helpers.randomNum(10) + 1)

      const updatedTxs = await osseus.lib.BlockchainTransaction.syncState(communityManagerAddress, 'TRANSFER')
      expect(updatedTxs).to.have.lengthOf(transferTxs.length)
      updatedTxs.forEach(tx => {
        expect(tx.state).to.equal('CONFIRMED')
        expect(tx.blockHash).not.to.be.undefined
        expect(tx.blockNumber).not.to.be.undefined
      })

      const updatedTxs2 = await osseus.lib.BlockchainTransaction.syncState(communityManagerAddress, 'CHANGE').catch(err => {
        expect(err).not.to.be.undefined
      })
      expect(updatedTxs2).to.be.undefined
    })

    it('should make some successful tranasctions (transfers and changes) and be able to update their state accordingly (CONFIRMED and FINALIZED)', async () => {
      const transferTxs = await makeSomeTransferTransactions(osseus.helpers.randomNum(10) + 1)
      const changeTxs = await makeSomeChangeTransactions(osseus.helpers.randomNum(10) + 1)

      osseus.config.blocks_to_finalize_bctx = 20

      const updatedTxs = await osseus.lib.BlockchainTransaction.syncState()
      expect(updatedTxs).to.have.lengthOf(transferTxs.length + changeTxs.length)
      updatedTxs.forEach(tx => {
        expect(tx.state).to.equal('CONFIRMED')
        expect(tx.blockHash).not.to.be.undefined
        expect(tx.blockNumber).not.to.be.undefined
      })

      osseus.config.blocks_to_finalize_bctx = 1

      const updatedTxs2 = await osseus.lib.BlockchainTransaction.syncState()
      expect(updatedTxs2).to.have.lengthOf(updatedTxs.length)
      updatedTxs2.forEach((tx, i) => {
        let isLast = i < updatedTxs2.length - 1
        expect(tx.state).to.equal(isLast ? 'FINALIZED' : 'CONFIRMED')
      })
    })
  })

  after(async function () {
    Object.keys(osseus.db_models).forEach(model => {
      osseus.db_models[model].getModel().remove({}, () => {})
    })
  })
})
