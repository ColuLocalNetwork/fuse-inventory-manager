const async = require('async')

const init = (osseus) => {
  this.osseus = osseus

  const getAllCommunities = () => {
    return new Promise(async (resolve, reject) => {
      const communities = {}
      const communitiesFromDB = await this.osseus.db_models.community.getAll().catch(err => {
        osseus.logger.warn(err)
        resolve(communities)
      })
      communitiesFromDB && async.each(communitiesFromDB, async community => {
        const communityId = community._id.toString()
        communities[communityId] = await this.osseus.lib.Community.get(communityId, community).catch(err => { osseus.logger.warn(err) })
      }, () => {
        resolve(communities)
      })
    })
  }

  return new Promise(async (resolve, reject) => {
    this.osseus.lib = {
      Community: require('./models/community')(this.osseus),
      Currency: require('./models/currency')(this.osseus),
      Transaction: require('./models/transaction')(this.osseus)
    }

    this.osseus.communities = await getAllCommunities().catch(err => { return reject(err) })
    osseus.logger.trace(`communities: ${Object.keys(this.osseus.communities)}`)

    osseus.logger.info(`LIB ready`)
    return resolve()
  })
}

module.exports = {
  init: init
}
