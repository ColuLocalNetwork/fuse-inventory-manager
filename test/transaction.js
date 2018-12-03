const OsseusHelper = require('./helpers/osseus')
const BigNumber = require('bignumber.js')
const coder = require('web3-eth-abi')
const expect = require('chai').expect

const ColuLocalCurrency = artifacts.require('cln-solidity/contracts/ColuLocalCurrency.sol')
const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

const A_LOT_OF_TXS = process.env.A_LOT_OF_TXS || 0

const ETH_BALANCE = 1 * TOKEN_DECIMALS
const CLN_BALANCE = 100 * TOKEN_DECIMALS
const CC_BALANCE = (A_LOT_OF_TXS || 250) * TOKEN_DECIMALS

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

contract('TRANSACTION', async (accounts) => {
  let osseus

  let cln

  let cc

  let currencyAddress

  let currencyBlockchainInfo

  let currency
  let community

  let managerAccountAddress
  let usersAccountAddress
  let merchantsAccountAddress

  const defaultBalances = {}

  const validateTransaction = (tx1, tx2, from, to, amount, state, context) => {
    expect(tx1).to.be.a('Object')
    expect(tx1.id).to.be.a('string')
    if (tx2) expect(tx1.id).to.equal(tx2._id.toString())
    expect(tx1.from.accountAddress).to.equal(tx2 ? tx2.from.accountAddress : from.accountAddress)
    expect(tx1.from.currency.toString()).to.equal(tx2 ? tx2.from.currency.toString() : from.currency)
    expect(tx1.to.accountAddress).to.equal(tx2 ? tx2.to.accountAddress : to.accountAddress)
    expect(tx1.to.currency.toString()).to.equal(tx2 ? tx2.to.currency.toString() : to.currency)
    expect(tx1.amount.toNumber()).to.be.greaterThan(0)
    expect(tx1.amount.toNumber()).to.equal(tx2 ? tx2.amount.toNumber() : amount)
    expect(tx1.context).to.equal(tx2 ? tx2.context : (context || 'other'))
    expect(tx1.state).to.equal(tx2 ? tx2.state : (state || 'DONE'))
  }

  const validateBalancesAfterTransaction = (participantEnd, tx) => {
    return new Promise(async (resolve, reject) => {
      const accountAddress = tx[participantEnd].accountAddress
      const currency = tx[participantEnd].currency.toString()
      const state = tx.state
      const amount = tx.amount.toNumber()
      const wallet = await osseus.db_models.wallet.getByAddress(accountAddress)
      const startingBalance = defaultBalances[accountAddress]
      const currencyBalance = wallet.balances.filter(balance => balance.currency.toString() === currency)[0]
      const actualBalance = currencyBalance.offchainAmount.toNumber()
      if (state === 'DONE') {
        expect(actualBalance).to.equal(participantEnd === 'from' ? startingBalance - amount : startingBalance + amount)
      }
      if (state === 'CANCELED') {
        expect(actualBalance).to.equal(startingBalance)
      }
      expect(currencyBalance.pendingTxs).to.be.an('array')
      expect(currencyBalance.pendingTxs).to.have.lengthOf(0)
      resolve()
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

    cc = await ColuLocalCurrency.at(currencyAddress)

    let insertCLNtoMarketMakerData = encodeInsertData(currencyAddress)
    await cln.transferAndCall(currencyFactory.address, 100000 * TOKEN_DECIMALS, insertCLNtoMarketMakerData)

    await currencyFactory.openMarket(currencyAddress)

    osseus = await OsseusHelper()
  })

  beforeEach(async function () {
    osseus.helpers.clearDB()

    currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    community = await osseus.lib.Community.create('Test Community', currency, osseus.helpers.randomStr(10))

    managerAccountAddress = community.wallets.filter(wallet => wallet.type === 'manager')[0].address
    usersAccountAddress = community.wallets.filter(wallet => wallet.type === 'users')[0].address
    merchantsAccountAddress = community.wallets.filter(wallet => wallet.type === 'merchants')[0].address

    // should have ETH
    await web3.eth.sendTransaction({from: accounts[0], to: managerAccountAddress, value: ETH_BALANCE})
    await web3.eth.sendTransaction({from: accounts[0], to: usersAccountAddress, value: ETH_BALANCE})
    await web3.eth.sendTransaction({from: accounts[0], to: merchantsAccountAddress, value: ETH_BALANCE})

    // should have CLN
    await cln.transfer(managerAccountAddress, CLN_BALANCE, {from: accounts[0]})
    await cln.transfer(usersAccountAddress, CLN_BALANCE, {from: accounts[0]})
    await cln.transfer(merchantsAccountAddress, CLN_BALANCE, {from: accounts[0]})

    // should have CC
    await cc.transfer(managerAccountAddress, CC_BALANCE, {from: accounts[0]})
    await cc.transfer(usersAccountAddress, CC_BALANCE, {from: accounts[0]})
    await cc.transfer(merchantsAccountAddress, CC_BALANCE, {from: accounts[0]})

    // update the wallets
    let amount = new BigNumber(CC_BALANCE)
    await osseus.db_models.wallet.update({'address': managerAccountAddress, 'balances.currency': currency.id}, {'balances.$.offchainAmount': amount, 'balances.$.blockchainAmount': amount})
    await osseus.db_models.wallet.update({'address': usersAccountAddress, 'balances.currency': currency.id}, {'balances.$.offchainAmount': amount, 'balances.$.blockchainAmount': amount})
    await osseus.db_models.wallet.update({'address': merchantsAccountAddress, 'balances.currency': currency.id}, {'balances.$.offchainAmount': amount, 'balances.$.blockchainAmount': amount})

    defaultBalances[managerAccountAddress] = CC_BALANCE
    defaultBalances[usersAccountAddress] = CC_BALANCE
    defaultBalances[merchantsAccountAddress] = CC_BALANCE
  })

  describe('GET', async () => {
    it('should get transaction (by id)', async () => {
      let amount = 10 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx1 = await osseus.lib.Transaction.transfer(from, to, amount)
      let tx2 = await osseus.db_models.tx.get({id: tx1.id})
      validateTransaction(tx1, tx2[0])
    })

    it('should get error if transaction not found (by id)', async () => {
      let fakeId = '123abc'

      let amount = 10 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx1 = await osseus.lib.Transaction.transfer(from, to, amount)
      from.currency = currency.id
      to.currency = currency.id
      validateTransaction(tx1, undefined, from, to, amount, 'DONE', 'transfer')

      let tx2 = await osseus.db_models.tx.get({id: fakeId}).catch(err => {
        expect(err).not.to.be.undefined
      })
      expect(tx2).to.be.undefined
    })

    it('should get transaction (by address)', async () => {
      let amount = 10 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx1 = await osseus.lib.Transaction.transfer(from, to, amount)

      let txs = await osseus.db_models.tx.get({fromAddress: managerAccountAddress})
      expect(txs).to.be.an('array')
      expect(txs).to.have.lengthOf(1)
      validateTransaction(tx1, txs[0])

      txs = await osseus.db_models.tx.get({toAddress: usersAccountAddress})
      expect(txs).to.be.an('array')
      expect(txs).to.have.lengthOf(1)
      validateTransaction(tx1, txs[0])
    })

    it('should get transaction (by state)', async () => {
      let amount = 10 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx1 = await osseus.lib.Transaction.transfer(from, to, amount)

      let txs = await osseus.db_models.tx.get({state: 'DONE'})
      expect(txs).to.be.an('array')
      expect(txs).to.have.lengthOf(1)
      validateTransaction(tx1, txs[0])
    })

    it('should get transaction (by currency)', async () => {
      let amount = 10 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx1 = await osseus.lib.Transaction.transfer(from, to, amount)

      let txs = await osseus.db_models.tx.get({currency: currency.id})
      expect(txs).to.be.an('array')
      expect(txs).to.have.lengthOf(1)
      validateTransaction(tx1, txs[0])
    })

    it('should get transaction (by multiple conditions)', async () => {
      let amount = 10 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx1 = await osseus.lib.Transaction.transfer(from, to, amount)

      let txs = await osseus.db_models.tx.get({address: managerAccountAddress, currency: currency.id, context: 'transfer', state: 'DONE'})
      expect(txs).to.be.an('array')
      expect(txs).to.have.lengthOf(1)
      validateTransaction(tx1, txs[0])
    })
  })

  describe('TRANSFER', async () => {
    it('should make a successful transaction (state should be DONE)', async () => {
      let amount = 10 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx = await osseus.lib.Transaction.transfer(from, to, amount)

      from.currency = currency.id
      to.currency = currency.id
      validateTransaction(tx, undefined, from, to, amount, 'DONE', 'transfer')
      await validateBalancesAfterTransaction('from', tx)
      await validateBalancesAfterTransaction('to', tx)
    })

    it('should not make a transaction if not enough balance (state should be CANCELED)', async () => {
      let amount = 10001 * TOKEN_DECIMALS
      let from = {accountAddress: managerAccountAddress, currency: currencyAddress}
      let to = {accountAddress: usersAccountAddress, currency: currencyAddress}

      let tx = await osseus.lib.Transaction.transfer(from, to, amount)

      from.currency = currency.id
      to.currency = currency.id
      validateTransaction(tx, undefined, from, to, amount, 'CANCELED', 'transfer')
      await validateBalancesAfterTransaction('from', tx)
      await validateBalancesAfterTransaction('to', tx)
    })

    describe(`A LOT (${A_LOT_OF_TXS})`, async () => {
      it('should make a lot of successful tranasctions', async () => {
        const generateTransactions = (n) => {
          const result = {
            txs: [],
            checks: {}
          }
          let accounts = [managerAccountAddress, usersAccountAddress, merchantsAccountAddress]
          for (let i = 0; i < n; i++) {
            const fromAccount = accounts[osseus.helpers.randomNum(3)]
            let otherAccounts = accounts.filter(a => a !== fromAccount)
            const toAccount = otherAccounts[osseus.helpers.randomNum(2)]
            let from = {accountAddress: fromAccount, currency: currencyAddress}
            let to = {accountAddress: toAccount, currency: currencyAddress}
            let amount = 1 * TOKEN_DECIMALS
            result.txs.push(makeTransaction(from, to, amount))
            result.checks[fromAccount] = result.checks[fromAccount] || 0
            result.checks[fromAccount] -= amount
            result.checks[toAccount] = result.checks[toAccount] || 0
            result.checks[toAccount] += amount
          }
          return result
        }

        const makeTransaction = (from, to, amount) => {
          return new Promise(async (resolve, reject) => {
            try {
              let tx = await osseus.lib.Transaction.transfer(from, to, amount)
              from.currency = currency.id
              to.currency = currency.id
              validateTransaction(tx, undefined, from, to, amount, 'DONE', 'transfer')
              resolve(tx)
            } catch (err) {
              reject(err)
            }
          })
        }

        const data = generateTransactions(A_LOT_OF_TXS)

        await Promise.all(data.txs, tx => { return tx })
          .then(results => {
            expect(results).to.have.lengthOf(A_LOT_OF_TXS)
            results.forEach(result => {
              expect(result).not.to.be.undefined
            })
          })

        Object.keys(data.checks).forEach(async accountAddress => {
          const amount = data.checks[accountAddress]
          const wallet = await osseus.db_models.wallet.getByAddress(accountAddress)
          const startingBalance = defaultBalances[accountAddress]
          const currencyBalance = wallet.balances.filter(balance => balance.currency.toString() === currency.id)[0]
          const actualBalance = currencyBalance.offchainAmount.toNumber()
          expect(actualBalance).to.equal(startingBalance + amount)
        })
      })
    })
  })

  describe('DEPOSIT', async () => {
    it('should make a successful transaction (state should be TRANSMITTED)', async () => {
      let bctx = await osseus.db_models.bctx.create({})

      let amount = 10 * TOKEN_DECIMALS
      let to = {accountAddress: managerAccountAddress, currency: currencyAddress}

      let tx = await osseus.lib.Transaction.deposit(to, amount, bctx.id)

      expect(tx).to.be.a('Object')
      expect(tx.id).to.be.a('string')
      expect(tx.to.accountAddress).to.equal(to.accountAddress)
      expect(tx.to.currency.toString()).to.equal(currency.id)
      expect(tx.amount.toNumber()).to.be.greaterThan(0)
      expect(tx.amount.toNumber()).to.equal(amount)
      expect(tx.context).to.equal('deposit')
      expect(tx.state).to.equal('TRANSMITTED')

      let updatedTransmit = await osseus.db_models.transmit.getById(tx.transmit)
      expect(updatedTransmit.offchainTransactions).to.have.lengthOf(1)
      expect(updatedTransmit.offchainTransactions[0].toString()).to.equal(tx.id)
      expect(updatedTransmit.blockchainTransactions).to.have.lengthOf(1)
      expect(updatedTransmit.blockchainTransactions[0].toString()).to.equal(bctx.id)

      let startingBalance = defaultBalances[tx.to.accountAddress]
      let balance = await osseus.db_models.wallet.getBlockchainBalance(to.accountAddress, currency.id)
      expect(balance).to.equal(startingBalance + amount)
    })

    describe(`A LOT (${A_LOT_OF_TXS})`, async () => {
      it('should make a lot of successful tranasctions', async () => {
        const generateTransactions = async (accounts, n) => {
          let txs = []
          let amounts = {}
          let bctx = await osseus.db_models.bctx.create({})

          for (let i = 0; i < n; i++) {
            let toAccount = accounts[osseus.helpers.randomNum(3)]
            let to = {accountAddress: toAccount, currency: currencyAddress}
            let amount = 1 * TOKEN_DECIMALS
            amounts[to.accountAddress] = amounts[to.accountAddress] || 0
            amounts[to.accountAddress] += amount
            txs.push(makeTransactionAndValidate(to, amount, bctx))
          }

          return {
            txs: txs,
            bctx: bctx.id,
            amounts: amounts
          }
        }

        const makeTransactionAndValidate = (to, amount, bctx) => {
          return new Promise(async (resolve, reject) => {
            try {
              let tx = await osseus.lib.Transaction.deposit(to, amount, bctx.id)
              expect(tx).to.be.a('Object')
              expect(tx.id).to.be.a('string')
              expect(tx.to.accountAddress).to.equal(to.accountAddress)
              expect(tx.to.currency.toString()).to.equal(currency.id)
              expect(tx.amount.toNumber()).to.be.greaterThan(0)
              expect(tx.amount.toNumber()).to.equal(amount)
              expect(tx.context).to.equal('deposit')
              expect(tx.state).to.equal('TRANSMITTED')
              resolve(tx)
            } catch (err) {
              reject(err)
            }
          })
        }

        const testAccounts = [managerAccountAddress, usersAccountAddress, merchantsAccountAddress]
        const data = await generateTransactions(testAccounts, A_LOT_OF_TXS)

        await Promise.all(data.txs, tx => { return tx })
          .then(async results => {
            expect(results).to.have.lengthOf(A_LOT_OF_TXS)
            results.forEach(result => {
              expect(result).not.to.be.undefined
            })
          })

        testAccounts.forEach(async account => {
          let startingBalance = defaultBalances[account]
          let balance = await osseus.db_models.wallet.getBlockchainBalance(account, currency.id)
          expect(balance).to.equal(startingBalance + data.amounts[account])
        })
      })
    })
  })

  describe('TRANSMIT', async () => {
    const makeSomeTransactions = (n) => {
      let txs = []

      const makeTransaction = (from, to, amount) => {
        return new Promise(async (resolve, reject) => {
          try {
            let tx = await osseus.lib.Transaction.transfer(from, to, amount)
            resolve(tx)
          } catch (err) {
            reject(err)
          }
        })
      }

      let localAccounts = [managerAccountAddress, usersAccountAddress, merchantsAccountAddress]

      for (let i = 0; i < n; i++) {
        let fromAccount = localAccounts[osseus.helpers.randomNum(3)]
        let otherAccounts = localAccounts.filter(a => a !== fromAccount)
        let toAccount = otherAccounts[osseus.helpers.randomNum(2)]
        let from = {accountAddress: fromAccount, currency: currencyAddress}
        let to = {accountAddress: toAccount, currency: currencyAddress}
        let amount = osseus.helpers.randomNum(5) * TOKEN_DECIMALS
        txs.push(makeTransaction(from, to, amount))
      }

      return txs
    }

    const validate = async (offchainResultsFiltered, transmitResults, condition) => {
      expect(transmitResults.txs).to.be.an('array')
      expect(offchainResultsFiltered).to.have.lengthOf(transmitResults.txs.length)
      expect(transmitResults.transmit.offchainTransactions).to.be.an('array')
      expect(offchainResultsFiltered).to.have.lengthOf(transmitResults.transmit.offchainTransactions.length)
      expect(offchainResultsFiltered).to.have.lengthOf(transmitResults.nUpdated)
      offchainResultsFiltered.forEach(obj => {
        expect(transmitResults.txs.indexOf(obj._id.toString())).to.be.greaterThan(-1)
        expect(transmitResults.transmit.offchainTransactions.indexOf(obj._id.toString())).to.be.greaterThan(-1)
      })

      let stateChecks = []
      offchainResultsFiltered.forEach(async obj => {
        stateChecks.push(new Promise(async (resolve, reject) => {
          let tx = await osseus.db_models.tx.get({id: obj._id})
          resolve(tx[0].state === 'TRANSMITTED')
        }))
      })
      let stateCheckResults = await Promise.all(stateChecks, check => { return check })
      let failedStateChecks = stateCheckResults.filter(check => !check)
      expect(failedStateChecks).to.have.lengthOf(0)
    }

    const jobsToFinish = () => {
      return new Promise(async (resolve, reject) => {
        const jobs = await osseus.agenda.jobs({name: 'bctx-transfer'})
        const nJobs = jobs.length
        let completed = 0
        osseus.agenda.on('complete:bctx-transfer', job => {
          completed++
          job.remove()
        })
        setInterval(() => {
          if (completed < nJobs) {
            console.log(`completed: ${completed} out of ${nJobs} jobs - keep waiting...`)
          } else {
            resolve()
          }
        }, 1000)
      })
    }

    it('should be able to transmit transactions for specific currency', async () => {
      let txs = makeSomeTransactions(osseus.helpers.randomNum(100))
      let offchainResults = await Promise.all(txs, tx => { return tx })
      let transmitResults = await osseus.lib.Transaction.transmit({filters: {currency: currency.id}, bc: {gas: 1000000}})
      expect(transmitResults).to.be.an('array')
      expect(transmitResults).to.have.lengthOf(1)
      let offchainResultsFiltered = offchainResults.filter(obj => obj.from.currency.toString() === currency.id)
      await validate(offchainResultsFiltered, transmitResults[0])
      await jobsToFinish()
    })

    it('should be able to transmit all transactions', async () => {
      let txs = makeSomeTransactions(osseus.helpers.randomNum(100))
      let offchainResults = await Promise.all(txs, tx => { return tx })
      let transmitResults = await osseus.lib.Transaction.transmit({filters: {}, bc: {gas: 1000000}})
      expect(transmitResults).to.be.an('array')
      expect(transmitResults).to.have.lengthOf(1)
      await validate(offchainResults, transmitResults[0])
      await jobsToFinish()
    })

    it('should be able to transmit relevant transacions, create some more and transmit only the ones not transmitted', async () => {
      let txs1 = makeSomeTransactions(osseus.helpers.randomNum(100))
      let offchainResults1 = await Promise.all(txs1, tx => { return tx })
      let transmitResults1 = await osseus.lib.Transaction.transmit({filters: {}, bc: {gas: 1000000}})
      expect(transmitResults1).to.be.an('array')
      expect(transmitResults1).to.have.lengthOf(1)
      await validate(offchainResults1, transmitResults1[0])
      await jobsToFinish()

      let txs2 = makeSomeTransactions(osseus.helpers.randomNum(100))
      let offchainResults2 = await Promise.all(txs2, tx => { return tx })
      let transmitResults2 = await osseus.lib.Transaction.transmit({filters: {}, bc: {gas: 1000000}})
      expect(transmitResults2).to.be.an('array')
      expect(transmitResults2).to.have.lengthOf(1)
      await validate(offchainResults2, transmitResults2[0])
      await jobsToFinish()
    })
  })

  after(async function () {
    osseus.helpers.clearDB()
    osseus.agenda.purge()
  })
})
