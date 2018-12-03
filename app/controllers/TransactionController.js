const BigNumber = require('bignumber.js')

module.exports = (osseus) => {
  return {
    /**
     * @apiDefine JWT
     * @apiHeader {String} Authorization JWT token generated using OSSEUS_ROUTER_JWT_SECRET value from the config.
     * @apiHeaderExample {json} Header-Example:
     *  {
     *      "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlZGVmYWNlYi1lYzIxLTRmZmQtOWQ5OS1mMTdiMmNiMDliNTEiLCJpYXQiOjE1NDAxMzEyODIsImV4cCI6MTU0MDEzNDg4Mn0.DrIdRXOPcqH_NSTs8aZ91-hpI2Tj04xgRoYxbpyr5ok"
     *  }
     */

    /**
     * @api {post} /api/transaction/transfer Transfer
     * @apiName Transfer
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Transfer between addresses offchain
     *
     * @apiUse JWT
     *
     * @apiParam {Object[]} from transaction from array (currently supports only one object)
     * @apiParam {String} from.accountAddress account address to transfer from
     * @apiParam {String} from.amount amount to transfer as string (for example: 100 can be sent as "100" or "1e2")
     * @apiParam {Object[]} to transaction to array (currently supports only one object)
     * @apiParam {String} to.accountAddress account address to transfer to
     * @apiParam {String} to.amount amount to transfer as string (for example: 100 can be sent as "100" or "1e2")
     * @apiParam {String} currencyAddress currency contract address to transfer
     *
     * @apiSuccess {String} id transaction unique id.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "id": "5bb9d9ab565e2f63d5f0263c"
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    transfer: async (req, res, next) => {
      const amountReducer = (a, b) => (new BigNumber(a)).plus(new BigNumber(b))

      let fromAmount = req.body.from.map(elem => elem.amount).reduce(amountReducer, new BigNumber(0))
      let toAmount = req.body.to.map(elem => elem.amount).reduce(amountReducer, new BigNumber(0))

      if (!fromAmount.isEqualTo(toAmount)) {
        return next(new Error(`There was an error trying to make the transfer (amounts mismatch)`))
      }

      osseus.lib.Transaction.transfer(
        {
          accountAddress: req.body.from[0].accountAddress,
          currency: req.body.currencyAddress
        },
        {
          accountAddress: req.body.to[0].accountAddress,
          currency: req.body.currencyAddress
        },
        fromAmount
      )
        .then(tx => {
          if (tx.state !== 'DONE') {
            return next(new Error(`There was an error trying to make the transfer`))
          }
          res.send({id: tx.id})
        })
        .catch(err => { return next(err) })
    },

    /**
     * @api {post} /api/transaction/change Change
     * @apiName Change
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Change `amount` of `fromToken` to `tokenAmount` by `account` account address. Optionally specify the market maker to use by id/address, or find the first one for the pair of tokens.
     *
     * @apiUse JWT
     *
     * @apiParam {String} account account address changing the tokens
     * @apiParam {String} fromToken token address of the token to sell
     * @apiParam {String} toToken token address of the token to buy
     * @apiParam {String} amount amount of `fromToken` to sell in exchange for `toToken` as string
     * @apiParam {String} [minReturn] minimum amount of `toToken` to receive in exchange for the `amount` of `fromToken`
     * @apiParam {String} [marketMakerId] market maker id.
     * @apiParam {String} [marketMakerAddress] market maker contract address.
     *
     * @apiSuccess {String} id transaction unique id.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "id": "5bb9d9ab565e2f63d5f0263c"
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    change: async (req, res, next) => {
      osseus.lib.Transaction.change(
        req.body.account,
        req.body.fromToken,
        req.body.toToken,
        req.body.amount,
        req.body.minReturn,
        req.body.marketMakerId,
        req.body.marketMakerAddress
      )
        .then(tx => { res.send({id: tx.id}) })
        .catch(err => { return next(err) })
    },

    /**
     * @api {post} /api/transaction/revert/id/:id Revert
     * @apiName Revert
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Revert a transaction (the server will create a reversed transaction)
     *
     * @apiUse JWT
     *
     * @apiParam {String} id transaction to revert id
     *
     * @apiSuccess {String} id revert transaction id.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "id": "5bb9d9ab565e2f63d5f0263c"
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    revert: async (req, res, next) => {
      let tx = await osseus.db_models.tx.getById(req.params.id).catch(err => { return next(err) })
      let currency = await osseus.db_models.currency.getById(tx.to.currency).catch(err => { return next(err) })
      osseus.lib.Transaction.transfer(
        {
          accountAddress: tx.to.accountAddress,
          currency: currency.currencyAddress
        },
        {
          accountAddress: tx.from.accountAddress,
          currency: currency.currencyAddress
        },
        tx.amount,
        {revert: tx.id}
      )
        .then(revertTx => {
          if (revertTx.state !== 'DONE') {
            return next(new Error(`There was an error trying to revert`))
          }
          res.send({id: revertTx.id})
        })
        .catch(err => { return next(err) })
    },

    /**
     * @api {get} /api/transaction/id/:id Get transaction by id
     * @apiName GetTransactionById
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Get transaction by transaction id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id transaction id.
     *
     * @apiSuccess {String} id transaction unique id
     * @apiSuccess {String} createdAt transaction creation time
     * @apiSuccess {String} updatedAt transaction last update time
     * @apiSuccess {Object} from transaction from object
     * @apiSuccess {String} from.accountAddress transaction from account address
     * @apiSuccess {String} from.currency transaction from currency contract address
     * @apiSuccess {Object} to tranasction to object
     * @apiSuccess {String} to.accountAddress transaction to account address
     * @apiSuccess {String} to.currency transaction to currency contract address
     * @apiSuccess {String} amount transaction amount as string (for example: 100 can be sent as "100" or "1e2")
     * @apiSuccess {String} transmit transmit unique id which includes the transcation
     * @apiSuccess {String} context transaction context ['transfer', 'change', 'deposit', 'other']
     * @apiSuccess {String} state transaction state ['NEW', 'PENDING', 'DONE', 'CANCELED', 'SELECTED', 'TRANSMITTED']
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *          "id": "5bbca471ecd49722e41715da",
     *          "createdAt": "2018-10-09T12:52:01.852Z",
     *          "updatedAt": "2018-10-09T12:52:01.852Z",
     *          "from": {
     *              "accountAddress": "0xd315d4762109b53acb9c7ce9c2ad9a39bbe6569e",
     *              "currency": "5bbb59ed97c430cb2dc28789"
     *          },
     *          "to": {
     *              "accountAddress": "0xddf5aec53c18e4e23e1a8888934f8331a86208e2",
     *              "currency": "5bbb59ed97c430cb2dc28789"
     *          },
     *          "amount": "10",
     *          "transmit": "5bbca471ecd49722e41715d9",
     *          "context": "transfer",
     *          "state": "DONE"
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    getTransactionById: async (req, res, next) => {
      osseus.db_models.tx.getById(req.params.id)
        .then(tx => { res.send(tx) })
        .catch(err => { next(err) })
    },

    /**
     * @api {post} /api/transaction/transmit Transmit
     * @apiName Transmit
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Aggregate offchain transactions and transmit to blockchain.
     *
     * Note that transactions are queued and transmitted serially.
     *
     * The array of results contains the transmit ids which can be sampled to get the relevant blockchain transactions, which can also be sampled to get their respective statuses.
     *
     * @apiUse JWT
     *
     * @apiParam {String} [currencyId] currency id to filter transactions transmitted to the blockchain
     *
     * @apiSuccess {Object[]} results array of currency and transmit pairs
     * @apiSuccess {String} results.currency currency id
     * @apiSuccess {String} results.transmit transmit id
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "results": [
     *       {
     *        "currency": "gT0Ut9GT0W6WSHjR0MlWIxYpd81383",
     *        "transmit": "LFt0hzkdD4uNbq2A1BkeSaJrudvBHA"
     *       },
     *       {
     *        "currency": "KKVp3mWqLs5R6dsqAwgT0Ut9GT0W6WS",
     *        "transmit": "yF2cN6xfbZQm1b8DHj8EYJ5yl6Rjd99"
     *       }
     *      ]
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    transmit: async (req, res, next) => {
      let opts = req.body.currencyId ? {filters: {currency: req.body.currencyId}} : {}
      osseus.lib.Transaction.transmit(opts)
        .then(results => {
          if (!results || results.length === 0) {
            return next(`Nothing to transmit`)
          }
          results = results.map(res => {
            return {
              currency: res.transmit.currency.toString(),
              transmit: res.transmit.id.toString()
            }
          })
          res.send({result: results})
        })
        .catch(err => { return next(err) })
    },

    /**
     * @api {get} /api/transaction/transmit/id/:id Get transmit by id
     * @apiName GetTransmitById
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Get transmit by transmit id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id transmit id.
     *
     * @apiSuccess {String} id transmit unique id
     * @apiSuccess {String} createdAt transmit creation time
     * @apiSuccess {String} updatedAt transmit last update time
     * @apiSuccess {String} currency currency id of transactions in the transmit
     * @apiSuccess {String} state transmit state ['PENDING', 'WORKING', 'DONE']
     * @apiSuccess {String[]} offchainTransactions array of offchain transaction ids processed in the transmit
     * @apiSuccess {String[]} blockchainTransactions array of blockchain transaction ids created in the transmit
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *         "id": "5bbca8b7876b5f2693e8336e",
     *         "createdAt": "2018-10-09T13:10:15.485Z",
     *         "updatedAt": "2018-10-09T13:10:15.485Z",
     *         "currency": "5bbb59ed97c430cb2dc28789",
     *         "state": "DONE",
     *         "offchainTransactions": [
     *             "5bbca8b7876b5f2693e8336f"
     *         ],
     *         "blockchainTransactions": [
     *             "5bbca8b7876b5f2693e8336c"
     *         ]
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    getTransmitById: async (req, res, next) => {
      osseus.db_models.transmit.getById(req.params.id)
        .then(transmit => { res.send(transmit) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/transaction/bc/id/:id Get BC transaction by id
     * @apiName GetBlockchainTransactionById
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Get blockchain transaction by blockchain transaction id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id blockchain transaction id.
     *
     * @apiSuccess {String} id blockchain transaction unique id
     * @apiSuccess {String} createdAt transaction creation time
     * @apiSuccess {String} updatedAt transaction last update time
     * @apiSuccess {String} blockHash block hash of transaction creation
     * @apiSuccess {Number} blockNumber block number of transaction creation
     * @apiSuccess {String} from sending ethereum address
     * @apiSuccess {String} gas gas used by the transaction
     * @apiSuccess {String} gasPrice gas price for the transaction
     * @apiSuccess {String} hash transaction unique hash
     * @apiSuccess {String} input tranasction encoded input data
     * @apiSuccess {Number} nonce transaction sequence number from the sending account
     * @apiSuccess {String} to receiving ethereum address
     * @apiSuccess {Number} transactionIndex transaction index in the block
     * @apiSuccess {String} value amount of ether sent in the transaction
     * @apiSuccess {String} type transaction type ['TRANSFER', 'CHANGE', 'DEPOSIT']
     * @apiSuccess {Object} meta transaction metadata
     * @apiSuccess {String} meta.from sender ethereum address (internal transaction)
     * @apiSuccess {String} meta.to receiver ethereum address (internal transaction)
     * @apiSuccess {String} meta.token currency contract address (internal transaction)
     * @apiSuccess {String} meta.amount currency amount transfered (internal transaction)
     * @apiSuccess {String} state transaction state ['TRANSMITTED', 'DONE', 'CONFIRMED']
     * @apiSuccess {Boolean} known is the transaction known by the inventory manager service
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *         "id": "5bbca8b7876b5f2693e8336c",
     *         "createdAt": "2018-10-09T13:10:15.466Z",
     *         "updatedAt": "2018-10-09T13:10:15.466Z",
     *         "blockHash": "0xf5c8668b80a8ff35a6685746ca536d76186b00b8b5348d6f80c6670a4f558a35",
     *         "blockNumber": 4199567,
     *         "from": "0xB8Ce4A040E8aA33bBe2dE62E92851b7D7aFd52De",
     *         "gas": "77806",
     *         "gasPrice": "1000000000",
     *         "hash": "0x5f19fbbc31a8f732bd71e73e59b5bb6be400da75a8b794827486e790d2a4f31d",
     *         "input": "0xa9059cbb000000000000000000000000d315d4762109b53acb9c7ce9c2ad9a39bbe6569e0000000000000000000000000000000000000000000000056bc75e2d63100000",
     *         "nonce": 7,
     *         "to": "0x24a85B72700cEc4cF1912ADCEBdB9E8f60BdAb91",
     *         "transactionIndex": 12,
     *         "value": "0",
     *         "type": "DEPOSIT",
     *         "meta": {
     *             "from": "0xB8Ce4A040E8aA33bBe2dE62E92851b7D7aFd52De",
     *             "to": "0xD315d4762109B53Acb9C7CE9c2AD9A39bbe6569E",
     *             "token": "0x24a85b72700cec4cf1912adcebdb9e8f60bdab91",
     *             "amount": "100000000000000000000"
     *         },
     *         "state": "CONFIRMED",
     *         "known": true
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    getBlockchainTransactionById: async (req, res, next) => {
      osseus.db_models.bctx.getById(req.params.id)
        .then(bctx => { res.send(bctx) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/transaction/bc/unknown Get unknown BC transactions
     * @apiName getUnknownBlockchainTransactions
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Get a list of unknown blockchain transactions
     *
     * @apiUse JWT
     *
     * @apiSuccess {String[]} ids array of blockchain transaction unique ids
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *         "ids": [
     *             "5bbca8b7876b5f2693e8336c",
     *             "5bbcb71d124d3c8f824a4e5f",
     *             "5bbcb734124d3c8f824a4e7e",
     *             "5bbcba87124d3c8f824a5002",
     *             "5bbcba9e124d3c8f824a5020"
     *         ]
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    getUnknownBlockchainTransactions: async (req, res, next) => {
      osseus.db_models.bctx.get({known: false})
        .then(bctxs => { bctxs = bctxs.map(bctx => bctx._id); res.send({ids: bctxs}) })
        .catch(err => { next(err) })
    },

    /**
     * @api {post} /api/transaction/bc/known Mark BC transactions as known
     * @apiName markBlockchainTransactionsAsKnown
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Update a list of blockchain transactions to be known
     *
     * @apiUse JWT
     *
     * @apiParam {String[]} ids blockchain transaction ids.
     *
     * @apiSuccess {String[]} ids array of updated blockchain transaction unique ids
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *         "ids": [
     *             "5bbca8b7876b5f2693e8336c",
     *             "5bbcb71d124d3c8f824a4e5f",
     *             "5bbcb734124d3c8f824a4e7e",
     *             "5bbcba87124d3c8f824a5002",
     *             "5bbcba9e124d3c8f824a5020"
     *         ]
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    markBlockchainTransactionsAsKnown: async (req, res, next) => {
      const tasks = []
      req.body.ids.forEach((id) => {
        tasks.push(new Promise(async (resolve, reject) => {
          osseus.db_models.bctx.update({_id: id}, {$set: {known: true}})
            .then(bctx => resolve(bctx))
            .catch(err => reject(err))
        }))
      })
      Promise.all(tasks, res => { return res })
        .then(bctxs => { bctxs = bctxs.map(bctx => bctx._id); res.send({ids: bctxs}) })
        .catch(err => { next(err) })
    },

    /**
     * @api {post} /api/transaction/bc/state Update BC transactions state
     * @apiName updateBlockchainTransactionsState
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiDescription Update state of blockchain transactions to "DONE" (if mined into block) or "CONFIRMED" according to the "BLOCKS_TO_CONFIRM_BCTX" config parameter
     *
     * @apiUse JWT
     *
     * @apiParam {String} [address] address (from/to) of blockchain transactions to filter by
     * @apiParam {String} [type] type of blockchain transactions to filter by - ['TRANSFER', 'CHANGE', 'DEPOSIT']
     * @apiParam {Number} [limit] number of blockchain transactions to check for state update (sorted by creation time)
     *
     * @apiSuccess {String[]} ids array of blockchain transaction unique ids
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *         "ids": [
     *             "5bbca8b7876b5f2693e8336c",
     *             "5bbcb71d124d3c8f824a4e5f",
     *             "5bbcb734124d3c8f824a4e7e",
     *             "5bbcba87124d3c8f824a5002",
     *             "5bbcba9e124d3c8f824a5020"
     *         ]
     *     }
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    updateBlockchainTransactionsState: async (req, res, next) => {
      osseus.lib.BlockchainTransaction.syncState()
        .then(bctxs => { bctxs = bctxs.map(bctx => bctx._id); res.send({ids: bctxs}) })
        .catch(err => { next(err) })
    }
  }
}
