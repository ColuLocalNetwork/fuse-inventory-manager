const axios = require('axios')

module.exports = (osseus) => {
  function notification () {}

  const postToWebhook = (url, notification) => {
    axios.post(url, notification)
      .then(response => {
        osseus.logger.debug(`Succesfully sent notification ${notification.id} to ${url}`)
      })
      .catch(err => {
        osseus.logger.warn(`There was a problem sending notification ${notification.id} to ${url} - ${err}`)
      })
  }

  const create = (level, type, communityId, title, content, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        const notification = await osseus.db_models.notification.create({level: level, type: type, community: communityId, title: title, content: content, data: data})
        if (communityId) {
          const community = await osseus.db_models.community.getById(communityId)
          if (community.webhookURL) {
            postToWebhook(community.webhookURL, notification)
          }
        }
        if (osseus.config.notifications_webhook_url) {
          postToWebhook(osseus.config.notifications_webhook_url, notification)
        }
        resolve(notification)
      } catch (err) {
        reject(err)
      }
    })
  }

  notification.create = create

  osseus.db_models.notification.levels.forEach(level => {
    notification[level.toLowerCase()] = (type, communityId, title, content, data) => create(level, type, communityId, title, content, data)
  })

  return notification
}
