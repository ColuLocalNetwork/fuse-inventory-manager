module.exports = (osseus) => {
  return {
    /**
     * @apiDefine CurrencySuccess
     * @apiSuccess {String} id
     * @apiSuccess {String} createdAt
     * @apiSuccess {String} updatedAt
     * @apiSuccess {String} currencyType
     * @apiSuccess {String} currencyAddress
     * @apiSuccess {String} [marketMakerAddress]
     * @apiSuccess {String} currencyABI
     * @apiSuccess {String} [marketMakerABI]
     * @apiSuccess {Object} currencyBlockchainInfo
     * @apiSuccess {String} currencyBlockchainInfo.id
     * @apiSuccess {String} currencyBlockchainInfo.blockHash
     * @apiSuccess {Number} currencyBlockchainInfo.blockNumber
     * @apiSuccess {String} currencyBlockchainInfo.transactionHash
     */

    /**
     * @api {post} /api/currency/ Create
     * @apiName PostCurrency
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
     * @apiUse CurrencySuccess
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
        osseus.logger.debug(`CurrencyController --> create --> cln: ${req.body.currencyAddress}`)
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
        osseus.logger.debug(`CurrencyController --> create --> cc: ${req.body.currencyAddress}`)
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

    edit: async (req, res, next) => {
      // TODO
      res.send({func: 'edit', pararms: req.params, body: req.body})
    },

    get: async (req, res, next) => {
      // TODO
      res.send({func: 'get', params: req.params})
    },

    editByAddress: async (req, res, next) => {
      // TODO
      res.send({func: 'editByAddress', pararms: req.params, body: req.body})
    },

    getByAddress: async (req, res, next) => {
      // TODO
      res.send({func: 'getByAddress', params: req.params})
    }
  }
}
