module.exports = (osseus) => {
  osseus.agenda.define('bctx-transfer', {concurrency: 1}, async (job, done) => {
    const errorHandler = err => done(new Error(err))

    if (!job || !job.attrs || !job.attrs.data) {
      return errorHandler(`Job data undefined`)
    }
    let tx = JSON.parse(job.attrs.data.tx)
    if (!tx) {
      return errorHandler(`Job data is missing "tx"`)
    }
    let transmitId = job.attrs.data.transmitId
    if (!transmitId) {
      return errorHandler(`Job data is missing "transmitId"`)
    }

    let bctx = await osseus.lib.BlockchainTransaction.transfer(tx.from, tx.to, tx.token, tx.amount, tx.opts).catch(err => { return errorHandler(err) })
    if (bctx) {
      await osseus.db_models.transmit.addBlockchainTransaction(transmitId, bctx.result.id).catch(err => { return errorHandler(err) })
      done(null, bctx)
    }
  })
}
