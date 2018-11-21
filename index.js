const Osseus = require('@colucom/osseus')
const Web3 = require('web3')
const cwd = process.cwd()

const main = async () => {
  try {
    const osseus = await Osseus.init()
    osseus.cwd = cwd

    if (osseus.config.debug) console.time('INVENTORY MANAGER')

    osseus.web3 = new Web3(new Web3.providers.HttpProvider(osseus.config.web3_provider))

    await require('./modules/utils').init(osseus)
    await require('./modules/db').init(osseus)
    await require('./modules/jobs').init(osseus)
    await require('./modules/lib').init(osseus)
    await require('./modules/listeners').init(osseus)
    await require('./modules/errors').init(osseus)

    if (osseus.config.debug) console.timeEnd('INVENTORY MANAGER')

    osseus.logger.info('INVENTORY MANAGER IS RUNNING :)')
  } catch (err) {
    console.error('BOOTSTRAP ERROR!', err.stack || err)
    process.exit(1)
  }
}

main()
