module.exports = (osseus) => {
  const buildUpdate = (data) => {
    let result = {}
    if (data.currencyAddress) result['currencyAddress'] = data.currencyAddress
    if (data.marketMakerAddress) result['marketMakerAddress'] = data.marketMakerAddress
    if (data.creationTransactionHash) result['currencyBlockchainInfo.transactionHash'] = data.creationTransactionHash
    if (data.creationBlockHash) result['currencyBlockchainInfo.blockHash'] = data.creationBlockHash
    if (data.creationBlockNumber) result['currencyBlockchainInfo.blockNumber'] = data.creationBlockNumber
    if (data.externalId) result['exid'] = data.externalId
    return result
  }

  return {
    /**
     * @apiDefine CurrencyResponse
     * @apiSuccess {String} id currency unique id.
     * @apiSuccess {String} createdAt currency creation time.
     * @apiSuccess {String} updatedAt currency last update time.
     * @apiSuccess {String} currencyType type of currency - CLN or CC.
     * @apiSuccess {String} currencyAddress currency contract address.
     * @apiSuccess {String} [marketMakerAddress] market maker contract address (only if currencyType is CC).
     * @apiSuccess {String} [exid] external id of the currency (defined by who ever created it).
     * @apiSuccess {Object} currencyBlockchainInfo see below.
     * @apiSuccess {String} currencyBlockchainInfo.blockHash block hash of currency contract creation.
     * @apiSuccess {Number} currencyBlockchainInfo.blockNumber block number of currency contract creation.
     * @apiSuccess {String} currencyBlockchainInfo.transactionHash transaction hash of currency contract creation.

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     "id": "5bb9d9ab565e2f63d5f0263c",
     *     "createdAt": "2018-10-07T10:02:19.305Z",
     *     "updatedAt": "2018-10-07T10:02:19.305Z",
     *     "currencyType": "CC",
     *     "currencyAddress": "0x245cf01fecaa32ab0566c318d1f28df91caf7865",
     *     "marketMakerAddress": "0xcb222bc0b05527772e0fc2173e00cde8b4a14879",
     *     "exid": "123abc456def",
     *     "currencyBlockchainInfo": {
     *        "blockHash": "0x66fc96b1cbf1de29ba0eea72492048f7c823bb7701d290229a2934fff5d59df1",
     *        "blockNumber": 3280283,
     *        "transactionHash": "0x21f3a02b07def2acddef6ebc9b2fdc40e7f138d662c64cb004e55f1dfde06859"
     *     }

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */

    /**
     * @api {post} /api/currency/ Create
     * @apiName CreateCurrency
     * @apiGroup Currency
     * @apiVersion 1.0.0
     *
     * @apiParam {Boolean} [cln] indicator whether creating a CLN currency.
     * @apiParam {String} currencyAddress currency contract address.
     * @apiParam {String} [marketMakerAddress] market maker contract address (Mandatory if creating a CC).
     * @apiParam {String} creationTransactionHash transaction hash of currency contract creation.
     * @apiParam {String} creationBlockHash block hash of currency contract creation.
     * @apiParam {Number} creationBlockNumber block number of currency contract creation.
     * @apiParam {String} [externalId] external id of the currency on the requester system.
     *
     * @apiUse CurrencyResponse
     */
    create: async (req, res, next) => {
      if (!osseus.web3.utils.isAddress(req.body.currencyAddress)) {
        return next(`Invalid currencyAddress: ${req.body.currencyAddress}`)
      }
      let currency
      let currencyBlockchainInfo = {
        transactionHash: req.body.creationTransactionHash,
        blockHash: req.body.creationBlockHash,
        blockNumber: req.body.creationBlockNumber
      }
      if (req.body.cln) {
        currency = await osseus.lib.Currency.createCLN(
          req.body.currencyAddress,
          osseus.abi.ColuLocalNetwork,
          currencyBlockchainInfo,
          req.body.externalId
        ).catch(err => { return next(err) })
      } else {
        if (!osseus.web3.utils.isAddress(req.body.marketMakerAddress)) {
          return next(`Invalid marketMakerAddress: ${req.body.marketMakerAddress}`)
        }
        currency = await osseus.lib.Currency.create(
          req.body.currencyAddress,
          req.body.marketMakerAddress,
          osseus.abi.ColuLocalCurrency,
          osseus.abi.EllipseMarketMaker,
          currencyBlockchainInfo,
          req.body.externalId
        ).catch(err => { return next(err) })
      }
      res.send(currency)
    },

    /**
     * @api {put} /api/currency/id/:id Edit by id
     * @apiName EditCurrencyById
     * @apiGroup Currency
     * @apiVersion 1.0.0
     *
     * @apiParam {String} id currency id.
     * @apiParam {String} [currencyAddress] currency contract address.
     * @apiParam {String} [marketMakerAddress] market maker contract address (Mandatory if creating a CC).
     * @apiParam {String} [creationTransactionHash] transaction hash of currency contract creation.
     * @apiParam {String} [creationBlockHash] block hash of currency contract creation.
     * @apiParam {Number} [creationBlockNumber] block number of currency contract creation.
     * @apiParam {String} [externalId] external id of the currency on the requester system.
     *
     * @apiUse CurrencyResponse
     */
    edit: async (req, res, next) => {
      if (!req.body || !Object.keys(req.body) || !Object.keys(req.body).length) {
        return next(`Nothing to update`)
      }
      let condition = {_id: req.params.id}
      let update = buildUpdate(req.body)
      osseus.db_models.currency.update(condition, update)
        .then(updatedCurrecny => { res.send(updatedCurrecny) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/currency/id/:id Get by id
     * @apiName GetCurrencyById
     * @apiGroup Currency
     * @apiVersion 1.0.0
     *
     * @apiParam {String} id currency id.
     *
     * @apiUse CurrencyResponse
     */
    get: async (req, res, next) => {
      osseus.db_models.currency.getById(req.params.id)
        .then(currency => { res.send(currency) })
        .catch(err => { next(err) })
    },

    /**
     * @api {put} /api/currency/address/:address Edit by address
     * @apiName EditCurrencyByAddress
     * @apiGroup Currency
     * @apiVersion 1.0.0
     *
     * @apiParam {String} address currency contract address.
     * @apiParam {String} [currencyAddress] currency contract address.
     * @apiParam {String} [marketMakerAddress] market maker contract address (Mandatory if creating a CC).
     * @apiParam {String} [creationTransactionHash] transaction hash of currency contract creation.
     * @apiParam {String} [creationBlockHash] block hash of currency contract creation.
     * @apiParam {Number} [creationBlockNumber] block number of currency contract creation.
     * @apiParam {String} [externalId] external id of the currency on the requester system.
     *
     * @apiUse CurrencyResponse
     */
    editByAddress: async (req, res, next) => {
      if (!req.body || !Object.keys(req.body) || !Object.keys(req.body).length) {
        return next(`Nothing to update`)
      }
      let condition = {currencyAddress: req.params.address}
      let update = buildUpdate(req.body)
      osseus.db_models.currency.update(condition, update)
        .then(updatedCurrecny => { res.send(updatedCurrecny) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/currency/address/:address Get by address
     * @apiName GetCurrencyByAddress
     * @apiGroup Currency
     * @apiVersion 1.0.0
     *
     * @apiParam {String} address currency contract address.
     *
     * @apiUse CurrencyResponse
     */
    getByAddress: async (req, res, next) => {
      osseus.db_models.currency.getByCurrencyAddress(req.params.address)
        .then(currency => { res.send(currency) })
        .catch(err => { next(err) })
    }
  }
}
