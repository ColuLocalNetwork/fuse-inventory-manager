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
     * @apiParam {String} id transaction to revert unique id
     *
     * @apiSuccess {String} id revert transaction unique id.
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
    }
  }
}
