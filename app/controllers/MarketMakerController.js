module.exports = (osseus) => {
  return {
    /**
     * @apiDefine MarketMakerResponse
     * @apiSuccess {String} id market maker unique id.
     * @apiSuccess {String} createdAt market maker creation time.
     * @apiSuccess {String} updatedAt market maker last update time.
     * @apiSuccess {String} address market maker contract address.
     * @apiSuccess {String} tokenAddress1 first token address supported by the market maker contract.
     * @apiSuccess {String} tokenAddress2 second token address supported by the market maker contract.

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "id": "5bf6a7828f86a54ffe3a58d3",
     *      "createdAt": "2018-11-22T12:56:34.660Z",
     *      "updatedAt": "2018-11-22T12:56:34.660Z",
     *      "address": "0x54b35ee5d1739018a9ce29c44bdf145529136706",
     *      "tokenAddress1": "0x41c9d91e96b933b74ae21bcbb617369cbe022530",
     *      "tokenAddress2": "0x24a85b72700cec4cf1912adcebdb9e8f60bdab91"
     *     }

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */

    /**
     * @apiDefine MarketMakerArrayResponse
     * @apiSuccess {String} id market maker unique id.
     * @apiSuccess {String} createdAt market maker creation time.
     * @apiSuccess {String} updatedAt market maker last update time.
     * @apiSuccess {String} address market maker contract address.
     * @apiSuccess {String} tokenAddress1 first token address supported by the market maker contract.
     * @apiSuccess {String} tokenAddress2 second token address supported by the market maker contract.

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     [
     *      {
     *      "id": "5bf6a7828f86a54ffe3a58d3",
     *      "createdAt": "2018-11-22T12:56:34.660Z",
     *      "updatedAt": "2018-11-22T12:56:34.660Z",
     *      "address": "0x54b35ee5d1739018a9ce29c44bdf145529136706",
     *      "tokenAddress1": "0x41c9d91e96b933b74ae21bcbb617369cbe022530",
     *      "tokenAddress2": "0x24a85b72700cec4cf1912adcebdb9e8f60bdab91"
     *      }
     *     ]

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */

    /**
     * @apiDefine JWT
     * @apiHeader {String} Authorization JWT token generated using OSSEUS_ROUTER_JWT_SECRET value from the config.
     * @apiHeaderExample {json} Header-Example:
     *  {
     *      "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlZGVmYWNlYi1lYzIxLTRmZmQtOWQ5OS1mMTdiMmNiMDliNTEiLCJpYXQiOjE1NDAxMzEyODIsImV4cCI6MTU0MDEzNDg4Mn0.DrIdRXOPcqH_NSTs8aZ91-hpI2Tj04xgRoYxbpyr5ok"
     *  }
     */

    /**
     * @api {post} /api/market-maker/ Create
     * @apiName CreateMarketMaker
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Create a new market maker
     *
     * @apiUse JWT
     *
     * @apiParam {String} address market maker contract address.
     * @apiParam {Object} abi market maker contract abi.
     * @apiParam {String} tokenAddress1 first token address supported by the market maker contract.
     * @apiParam {String} tokenAddress2 second token address supported by the market maker contract.
     *
     * @apiUse MarketMakerResponse
     */
    create: async (req, res, next) => {
      ['address', 'tokenAddress1', 'tokenAddress2'].forEach(k => {
        if (!osseus.web3.utils.isAddress(req.body[k])) {
          return next(`Invalid address: ${req.body[k]}`)
        }
      })
      osseus.lib.MarketMaker.create(req.body.address, JSON.stringify(req.body.abi), req.body.tokenAddress1, req.body.tokenAddress2)
        .then(marketMaker => {
          osseus.lib.Notification.info(`API`, null, `MarketMaker Created`, null, marketMaker.id)
          res.send(marketMaker)
        })
        .catch(err => { return next(err) })
    },

    /**
     * @api {put} /api/market-maker/id/:id Edit by id
     * @apiName EditMarketMakerById
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Edit market maker by market maker id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id market maker id.
     * @apiParam {String} [address] market maker contract address.
     * @apiParam {Object} [abi] market maker contract abi.
     * @apiParam {String} [tokenAddress1] first token address supported by the market maker contract.
     * @apiParam {String} [tokenAddress2] second token address supported by the market maker contract.
     *
     * @apiUse MarketMakerResponse
     */
    edit: async (req, res, next) => {
      if (!req.body || !Object.keys(req.body) || !Object.keys(req.body).length) {
        return next(`Nothing to update`)
      }
      osseus.lib.MarketMaker.update({_id: req.params.id}, req.body)
        .then(updatedMarketMaker => {
          osseus.lib.Notification.info(`API`, null, `MarketMaker Edited`, null, req.params.id)
          res.send(updatedMarketMaker)
        })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/market-maker/id/:id Get by id
     * @apiName GetMarketMakerById
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Get market maker by market maker id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id market maker id.
     *
     * @apiUse MarketMakerResponse
     */
    get: async (req, res, next) => {
      osseus.lib.MarketMaker.getById(req.params.id)
        .then(marketMaker => { res.send(marketMaker) })
        .catch(err => { next(err) })
    },

    /**
     * @api {put} /api/market-maker/address/:address Edit by address
     * @apiName EditMarketMakerByAddress
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Edit market maker by market maker contract address
     *
     * @apiUse JWT
     *
     * @apiParam {String} address market maker contract address.
     * @apiParam {String} [address] market maker contract address.
     * @apiParam {Object} [abi] market maker contract abi.
     * @apiParam {String} [tokenAddress1] first token address supported by the market maker contract.
     * @apiParam {String} [tokenAddress2] second token address supported by the market maker contract.
     *
     * @apiUse MarketMakerResponse
     */
    editByAddress: async (req, res, next) => {
      if (!req.body || !Object.keys(req.body) || !Object.keys(req.body).length) {
        return next(`Nothing to update`)
      }
      osseus.lib.MarketMaker.update({address: req.params.address}, req.body)
        .then(updatedMarketMaker => {
          osseus.lib.Notification.info(`API`, null, `MarketMaker Edited`, null, updatedMarketMaker.id)
          res.send(updatedMarketMaker)
        })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/market-maker/address/:address Get by address
     * @apiName GetMarketMakerByAddress
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Get market maker by market maker contract address
     *
     * @apiUse JWT
     *
     * @apiParam {String} address market maker contract address.
     *
     * @apiUse MarketMakerResponse
     */
    getByAddress: async (req, res, next) => {
      osseus.lib.MarketMaker.getByAddress(req.params.address)
        .then(marketMaker => { res.send(marketMaker) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/market-maker/pair Get by pair of tokens
     * @apiName GetMarketMakerByPair
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Get market maker by a pair of token addresses (order not important). Note that this endpoint will return an array of Market Makers.
     *
     * @apiUse JWT
     *
     * @apiParam {String} tokenAddress1 first token address supported by the market maker contract.
     * @apiParam {String} tokenAddress2 second token address supported by the market maker contract.
     *
     * @apiUse MarketMakerArrayResponse
     */
    getByPair: async (req, res, next) => {
      osseus.lib.MarketMaker.getByPair(req.query.tokenAddress1, req.query.tokenAddress2)
        .then(marketMakers => { res.send(marketMakers) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/market-maker/quote Get quote for exchanging
     * @apiName GetQuote
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Get quote from market maker for exchanging `amount` of `fromToken` to `toToken`. Optionally specify the market maker to use by id/address, or find the first one for the pair of tokens.
     *
     * @apiUse JWT
     *
     * @apiParam {String} fromToken token address of the token to sell
     * @apiParam {String} toToken token address of the token to buy
     * @apiParam {String} amount amount of `fromToken` to sell in exchange for `toToken` as string
     * @apiParam {String} [id] market maker id.
     * @apiParam {String} [address] market maker contract address.
     *
     * @apiSuccess {String} quote the amount of `toToken` which will be received in exchange for `amount` of `fromToken`.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *       "quote": "289581836731872302913"
     *     }

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    quote: async (req, res, next) => {
      osseus.lib.MarketMaker.quote(req.query.fromToken, req.query.toToken, req.query.amount, {id: req.query.id, address: req.query.address})
        .then(quote => { res.send({quote: quote.toString()}) })
        .catch(err => { next(err) })
    }
  }
}
