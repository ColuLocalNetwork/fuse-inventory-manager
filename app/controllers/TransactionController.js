module.exports = (osseus) => {
  return {
    /**
     * @api {post} /transaction/transfer Transfer
     * @apiName Transfer
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiParam {String} fromAddress account address to transfer from
     * @apiParam {String} toAddress account address to transfer to
     * @apiParam {String} currencyAddress currency contract address to transfer
     * @apiParam {String} amount amount to transfer as string (for example: 100 can be sent as "100" or "1e2")
     *
     * @apiSuccess {String} id transaction unique id.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     "id": "5bb9d9ab565e2f63d5f0263c"
     *
     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    transfer: async (req, res, next) => {
      let tx = await osseus.lib.Transaction.transfer(
        {
          accountAddress: req.body.fromAddress,
          currency: req.body.currencyAddress
        },
        {
          accountAddress: req.body.toAddress,
          currency: req.body.currencyAddress
        },
        req.body.amount
      ).catch(err => { return next(err) })
      if (tx.state !== 'DONE') {
        return next(new Error(`There was an error trying to make the transfer`)) // TODO add the reason
      }
      res.send({id: tx.id})
    },

    /**
     * @api {post} /transaction/revert/id/:id Revert
     * @apiName Revert
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiParam {String} id transaction to revert id
     *
     * @apiSuccess {String} id revert transaction id.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     "id": "5bb9d9ab565e2f63d5f0263c"
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
      let revertTx = await osseus.lib.Transaction.transfer(
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
      ).catch(err => { return next(err) })
      if (revertTx.state !== 'DONE') {
        return next(new Error(`There was an error trying to revert`)) // TODO add the reason
      }
      res.send({id: revertTx.id})
    },

    /**
     * @api {get} /transaction/id/:id Get transaction by id
     * @apiName GetTransactionById
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiParam {String} id transaction id.
     *
     * @apiSuccess {String} id transaction unique id
     * @apiSuccess {String} createdAt transaction creation time
     * @apiSuccess {String} updatedAt transaction last update time
     * @apiSuccess {Object} from transacrtion from object
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
     * @api {get} /transaction/bc/id/:id Get BC transaction by id
     * @apiName GetBlockchainTransactionById
     * @apiGroup Transaction
     * @apiVersion 1.0.0
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
     * @apiSuccess {String} state transaction state ['TRANSMITTED', 'CONFIRMED', 'FINALIZED']
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
     * @api {get} /transaction/transmit/id/:id Get transmit by id
     * @apiName GetTransmitById
     * @apiGroup Transaction
     * @apiVersion 1.0.0
     *
     * @apiParam {String} id transmit id.
     *
     * @apiSuccess {String} id transmit unique id
     * @apiSuccess {String} createdAt transmit creation time
     * @apiSuccess {String} updatedAt transmit last update time
     * @apiSuccess {String} currency currency id of transactions in the transmit
     * @apiSuccess {String} state transmit state ['ACTIVE', 'WORKING_ON', 'DONE']
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
    }
  }
}
