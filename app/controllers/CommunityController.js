module.exports = (osseus) => {
  return {
    /**
     * @apiDefine ErrorResponse
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
     * @api {post} /api/community/ Create
     * @apiName CreateCommunity
     * @apiGroup Community
     * @apiVersion 1.0.0
     *
     * @apiDescription Create a new community
     *
     * @apiUse JWT
     *
     * @apiParam {String} name community name.
     * @apiParam {String} defaultCurrency default community currency id.
     * @apiParam {String} [externalId] external id of the community on the requester system.
     * @apiParam {String} [webhookURL] webhook url to receive community related notifications.
     * @apiParam {Object[]} [wallets] array of wallets for the community, if not defined a default of three wallets is created ("manager", "users", "merchants").
     * @apiParam {String} wallet.type type of the wallet (a "manager" wallet must exist in the array, other types are up to the requester).
     * @apiParam {String} wallet.exid external id of the wallet on the requester system.
     *
     * @apiSuccess {String} id community unique id.
     * @apiSuccess {String} createdAt community creation time.
     * @apiSuccess {String} updatedAt community last update time.
     * @apiSuccess {String} name community name.
     * @apiSuccess {Object[]} wallets array of community wallets.
     * @apiSuccess {String} wallet.id wallet unique id.
     * @apiSuccess {String} wallet.createdAt wallet creation time.
     * @apiSuccess {String} wallet.updatedAt wallet last update time.
     * @apiSuccess {String} wallet.type wallet type (one of the defaults - "manager", "users", "merchants" or custome defined).
     * @apiSuccess {String} [wallet.exid] wallet external id (defined by the creator).
     * @apiSuccess {String} wallet.address wallet account address on the blockchain.
     * @apiSuccess {Number} wallet.index wallet index the wallet is managed at by the provider.
     * @apiSuccess {String} defaultCurrency default community currency id.
     * @apiSuccess {String} [exid] external id of the community (defined by who ever created it).
     * @apiSuccess {String} [webhookURL] webhook url of the community (defined by who ever created it).
     * @apiSuccess {String} mnemonic generated mnemonic for the community
     * @apiSuccess {String} uuid generated uuid for the community

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *     "id": "5bb9e8014350ec77ce164b2e",
     *     "createdAt": "2018-10-07T11:03:29.194Z",
     *     "updatedAt": "2018-10-07T11:03:29.194Z",
     *     "name": "Community #1",
     *     "wallets": [
     *         {
     *             "id": "5bb9e8014350ec77ce164b2f",
     *             "createdAt": "2018-10-07T11:03:29.216Z",
     *             "updatedAt": "2018-10-07T11:03:29.216Z",
     *             "type": "manager",
     *             "address": "0xe48bd0616ede00b700470faaf7f84262cebbee05",
     *             "index": 0
     *         },
     *         {
     *             "id": "5bb9e8014350ec77ce164b31",
     *             "createdAt": "2018-10-07T11:03:29.222Z",
     *             "updatedAt": "2018-10-07T11:03:29.222Z",
     *             "type": "users",
     *             "address": "0x089cd4348742ba3445d2bb8243470feebbac6a40",
     *             "index": 1
     *         },
     *         {
     *             "id": "5bb9e8014350ec77ce164b33",
     *             "createdAt": "2018-10-07T11:03:29.226Z",
     *             "updatedAt": "2018-10-07T11:03:29.226Z",
     *             "type": "merchants",
     *             "address": "0x99d0a5d79cdc761525ed3cd7187f305df0559ccb",
     *             "index": 2
     *         }
     *     ],
     *     "defaultCurrency": "5bb9bff7e50dea460c5f8eac",
     *     "exid": "JEDKfTIkVAXL5yRZ28h09hMk2td2",
     *     "webhookURL": "https://postman-echo.com/post",
     *     "mnemonic": "very fruit feel scissors innocent holiday asthma expect despair exchange apple blanket",
     *     "uuid": "6e98343f-1c60-4d52-8f06-e68a7cdef023"
     *  }

     * @apiUse ErrorResponse
     */
    create: async (req, res, next) => {
      osseus.lib.Community.create(req.body.name, req.body.defaultCurrency, req.body.externalId, req.body.webhookURL, req.body.wallets)
        .then(community => { res.send(community.toJSON({onCreate: true})) })
        .catch(err => { next(err) })
    },

    /**
     * @api {put} /api/community/id/:id Edit
     * @apiName EditCommunity
     * @apiGroup Community
     * @apiVersion 1.0.0
     *
     * @apiDescription Edit community by community id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id community id.
     * @apiParam {String} [name] community name.
     * @apiParam {String} [externalId] external id of the community on the requester system.
     * @apiParam {String} [webhookURL] webhook url to receive community related notifications.
     *
     * @apiSuccess {String} id community unique id.
     * @apiSuccess {String} createdAt community creation time.
     * @apiSuccess {String} updatedAt community last update time.
     * @apiSuccess {String} name community name.
     * @apiSuccess {Object[]} wallets array of community wallet unique ids.
     * @apiSuccess {String} defaultCurrency default community currency id.
     * @apiSuccess {String} [exid] external id of the community (defined by who ever created it).
     * @apiSuccess {String} [webhookURL] webhook url of the community (defined by who ever created it).

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *     "id": "5bb9e8014350ec77ce164b2e",
     *     "createdAt": "2018-10-07T11:03:29.194Z",
     *     "updatedAt": "2018-10-07T11:03:29.194Z",
     *     "name": "Community #1",
     *     "wallets": [
     *         "5bb9e8014350ec77ce164b2f",
     *         "5bb9e8014350ec77ce164b31",
     *         "5bb9e8014350ec77ce164b33"
     *     ],
     *     "defaultCurrency": "5bb9bff7e50dea460c5f8eac",
     *     "exid": "JEDKfTIkVAXL5yRZ28h09hMk2td2",
     *     "webhookURL": "https://postman-echo.com/post",
     *  }

     * @apiUse ErrorResponse
     */
    edit: async (req, res, next) => {
      const allowedToEdit = ['name', 'externalId', 'webhookURL']
      if (!req.body || !Object.keys(req.body) || !Object.keys(req.body).length) {
        return next(`Nothing to update`)
      }
      if (!Object.keys(req.body).every(elem => allowedToEdit.includes(elem))) {
        return next(`Can update only [${allowedToEdit}]`)
      }
      let update = {}
      if (req.body.name) update['name'] = req.body.name
      if (req.body.externalId) update['exid'] = req.body.externalId
      if (req.body.webhookURL) update['webhookURL'] = req.body.webhookURL
      osseus.db_models.community.update(req.params.id, update)
        .then(updatedCommunity => { res.send(updatedCommunity) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/community/id/:id Get by id
     * @apiName GetCommunity
     * @apiGroup Community
     * @apiVersion 1.0.0
     *
     * @apiDescription Get community by community id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id community id.
     *
     * @apiSuccess {String} id community unique id.
     * @apiSuccess {String} createdAt community creation time.
     * @apiSuccess {String} updatedAt community last update time.
     * @apiSuccess {String} name community name.
     * @apiSuccess {Object[]} wallets array of community wallet unique ids.
     * @apiSuccess {String} defaultCurrency default community currency id.
     * @apiSuccess {String} [exid] external id of the community (defined by who ever created it).
     * @apiSuccess {String} [webhookURL] webhook url of the community (defined by who ever created it).

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *     "id": "5bb9e8014350ec77ce164b2e",
     *     "createdAt": "2018-10-07T11:03:29.194Z",
     *     "updatedAt": "2018-10-07T11:03:29.194Z",
     *     "name": "Community #1",
     *     "wallets": [
     *         "5bb9e8014350ec77ce164b2f",
     *         "5bb9e8014350ec77ce164b31",
     *         "5bb9e8014350ec77ce164b33"
     *     ],
     *     "defaultCurrency": "5bb9bff7e50dea460c5f8eac"
     *  }

     * @apiUse ErrorResponse
     */
    get: async (req, res, next) => {
      osseus.db_models.community.getById(req.params.id)
        .then(community => { res.send(community) })
        .catch(err => { next(err) })
    }
  }
}
