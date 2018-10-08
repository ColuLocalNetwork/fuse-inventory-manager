module.exports = (osseus) => {
  return {
    /**
     * @apiDefine WalletResponse
     * @apiSuccess {String} id wallet unique id.
     * @apiSuccess {String} createdAt wallet creation time.
     * @apiSuccess {String} updatedAt wallet last update time.
     * @apiSuccess {String} type type of the wallet.
     * @apiSuccess {String} address wallet account address on the blockchain.
     * @apiSuccess {Number} index wallet index the wallet is managed at by the provider.
     * @apiSuccess {String} [exid] wallet external id (defined by the creator).
     * @apiSuccess {Balance[]} balances array of balances per currency for wallet
     * @apiSuccess {String} balances.id balance unique id
     * @apiSuccess {String} balances.createdAt balance creation time
     * @apiSuccess {String} balances.updatedAt balance last update time
     * @apiSuccess {String} balances.currency balance currency
     * @apiSuccess {Number} [balances.blockNumberOfLastUpdate] the block number of last update to balance.blockchainAmount
     * @apiSuccess {String} balances.blockchainAmount the blockchain balance (as last synced on balance.blockNumberOfLastUpdate)
     * @apiSuccess {String} balances.offchainAmount the offchain balance (updated each offchain transaction)
     * @apiSuccess {String[]} balances.pendingTxs array of pending offchain transactions (should be empty if all is working)

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     "id": "5bb9d9ab565e2f63d5f0263c",
     *     "createdAt": "2018-10-07T10:02:19.305Z",
     *     "updatedAt": "2018-10-07T10:02:19.305Z",
     *     "type": "some_kind_of_type",
     *     "address": "0x3b957f959e227d5accf7625e638fab02605dfd93",
     *     "index": 3,
     *     "exid": "123abc",
     *     "balances": [
     *         {
     *             "id": "5bbb4e116666efbde308f212",
     *             "createdAt": "2018-10-08T12:31:13.191Z",
     *             "updatedAt": "2018-10-08T12:31:13.191Z",
     *             "currency": "5bb9bff7e50dea460c5f8eac",
     *             "blockNumberOfLastUpdate": 0,
     *             "blockchainAmount": "0",
     *             "offchainAmount": "0",
     *             "pendingTxs": []
     *         }
     *     ]

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */

    /**
     * @api {post} /api/wallet/ Create
     * @apiName CreateWallet
     * @apiGroup Wallet
     * @apiVersion 1.0.0
     *
     * @apiParam {String} communityId community id in which to create the wallet
     * @apiParam {String} type type of the wallet
     * @apiParam {String} [externalId] external id of the wallet on the requester system.
     *
     * @apiUse WalletResponse
     */
    create: async (req, res, next) => {
      // TODO make sure that cannot create a `manager`
      let communityData = await osseus.lib.Community.get(req.body.communityId)

      let address = communityData.provider.addAddress()

      let wallet = await osseus.db_models.wallet.create({
        address: address,
        type: req.body.type,
        index: communityData.community.wallets.length,
        balances: [{
          currency: communityData.community.defaultCurrency,
          blockchainAmount: 0,
          blockNumberOfLastUpdate: 0,
          offchainAmount: 0,
          pendingTxs: []
        }],
        exid: req.body.externalId
      }).catch(err => { return next(err) })

      let communityWallets = communityData.community.wallets.map(w => w.id)
      communityWallets.push(wallet.id)

      await osseus.db_models.community.update(req.body.communityId, {wallets: communityWallets}).catch(err => { return next(err) })

      res.send(wallet)
    },

    /**
     * @api {put} /api/wallet/id/:id Edit by id
     * @apiName EditWalletById
     * @apiGroup Wallet
     * @apiVersion 1.0.0
     *
     * @apiParam {String} id wallet id.
     * @apiParam {String} [type] type of the wallet.
     * @apiParam {String} [externalId] external id of the wallet on the requester system.
     *
     * @apiUse CurrencyResponse
     */
    edit: async (req, res, next) => {
      const allowedToEdit = ['type', 'externalId']
      // TODO make sure that cannot edit to/from `manager` and leave community without one
      if (!req.body || !Object.keys(req.body) || !Object.keys(req.body).length) {
        return next(`Nothing to update`)
      }
      if (!Object.keys(req.body).every(elem => allowedToEdit.includes(elem))) {
        return next(`Can update only [${allowedToEdit}]`)
      }
      let update = {}
      if (req.body.type) update['type'] = req.body.type
      if (req.body.externalId) update['exid'] = req.body.externalId
      osseus.db_models.wallet.update({_id: req.params.id}, update)
        .then(updatedWallet => { res.send(updatedWallet) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/wallet/id/:id Get by id
     * @apiName GetWalletById
     * @apiGroup Wallet
     * @apiVersion 1.0.0
     *
     * @apiParam {String} id wallet id.
     *
     * @apiUse WalletResponse
     */
    get: async (req, res, next) => {
      osseus.db_models.wallet.getById(req.params.id)
        .then(wallet => { res.send(wallet) })
        .catch(err => { next(err) })
    },

    /**
     * @api {put} /api/wallet/address/:address Edit by address
     * @apiName EditWalletByAddress
     * @apiGroup Wallet
     * @apiVersion 1.0.0
     *
     * @apiParam {String} address wallet account address.
     * @apiParam {String} [type] type of the wallet.
     * @apiParam {String} [externalId] external id of the wallet on the requester system.
     *
     * @apiUse CurrencyResponse
     */
    editByAddress: async (req, res, next) => {
      // TODO make sure that cannot edit to/from `manager` and leave community without one
      const allowedToEdit = ['type', 'externalId']
      if (!req.body || !Object.keys(req.body) || !Object.keys(req.body).length) {
        return next(`Nothing to update`)
      }
      if (!Object.keys(req.body).every(elem => allowedToEdit.includes(elem))) {
        return next(`Can update only [${allowedToEdit}]`)
      }
      let update = {}
      if (req.body.type) update['type'] = req.body.type
      if (req.body.externalId) update['exid'] = req.body.externalId
      osseus.db_models.wallet.update({address: req.params.address}, update)
        .then(updatedWallet => { res.send(updatedWallet) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/wallet/address/:address Get by address
     * @apiName GetWalletByAddress
     * @apiGroup Wallet
     * @apiVersion 1.0.0
     *
     * @apiParam {String} address wallet account address.
     *
     * @apiUse WalletResponse
     */
    getByAddress: async (req, res, next) => {
      osseus.db_models.wallet.getByAddress(req.params.address)
        .then(wallet => { res.send(wallet) })
        .catch(err => { next(err) })
    }
  }
}
