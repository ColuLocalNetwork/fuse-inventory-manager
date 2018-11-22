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
     *     "id": "5bf6a7828f86a54ffe3a58d3",
     *     "createdAt": "2018-11-22T12:56:34.660Z",
     *     "updatedAt": "2018-11-22T12:56:34.660Z",
     *     "address": "0x54b35ee5d1739018a9ce29c44bdf145529136706",
     *     "tokenAddress1": "0x41c9d91e96b933b74ae21bcbb617369cbe022530",
     *     "tokenAddress2": "0x24a85b72700cec4cf1912adcebdb9e8f60bdab91"

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
      const marketMaker = await osseus.lib.MarketMaker.create(
        req.body.address,
        JSON.stringify(req.body.abi),
        req.body.tokenAddress1,
        req.body.tokenAddress2
      ).catch(err => { return next(err) })
      res.send(marketMaker)
    },

    /**
     * @api {put} market-maker/id/:id Edit by id
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
      osseus.db_models.marketMaker.update({_id: req.params.id}, req.body)
        .then(updatedMarketMaker => { res.send(updatedMarketMaker) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} market-maker/id/:id Get by id
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
      osseus.db_models.marketMaker.getById(req.params.id)
        .then(marketMaker => { res.send(marketMaker) })
        .catch(err => { next(err) })
    },

    /**
     * @api {put} market-maker/address/:address Edit by address
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
      osseus.db_models.marketMaker.update({address: req.params.address}, req.body)
        .then(updatedMarketMaker => { res.send(updatedMarketMaker) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} market-maker/address/:address Get by address
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
      osseus.db_models.marketMaker.getByAddress(req.params.address)
        .then(marketMaker => { res.send(marketMaker) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} market-maker/pair Get by pair of tokens
     * @apiName GetMarketMakerByPair
     * @apiGroup Market Maker
     * @apiVersion 1.0.0
     *
     * @apiDescription Get market maker by a pair of token addresses (order not important)
     *
     * @apiUse JWT
     *
     * @apiParam {String} tokenAddress1 first token address supported by the market maker contract.
     * @apiParam {String} tokenAddress2 second token address supported by the market maker contract.
     *
     * @apiUse MarketMakerResponse
     */
    getByPair: async (req, res, next) => {
      osseus.db_models.marketMaker.getByPair(req.query.tokenAddress1, req.query.tokenAddress2)
        .then(marketMaker => { res.send(marketMaker) })
        .catch(err => { next(err) })
    }
  }
}
