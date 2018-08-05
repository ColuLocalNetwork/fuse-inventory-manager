const Osseus = require('osseus')
const cwd = process.cwd()

const main = async () => {
  try {
    const osseus = await Osseus.init()
    osseus.cwd = cwd

    console.time('INVENTORY MANAGER')

    await require('./modules/db').init(osseus)
    await require('./modules/errors').init(osseus)

    console.timeEnd('INVENTORY MANAGER')
    osseus.logger.info('INVENTORY MANAGER IS RUNNING :)')
  } catch (err) {
    console.error('BOOTSTRAP ERROR!', err.stack)
    process.exit(1)
  }
}

main()
