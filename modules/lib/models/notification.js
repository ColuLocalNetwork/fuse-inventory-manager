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

  notification.getById = (notificationId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const notification = await osseus.db_models.notification.getById(notificationId)
        resolve(notification)
      } catch (err) {
        reject(err)
      }
    })
  }

  notification.getUnread = (filter, offset, limit) => {
    return new Promise(async (resolve, reject) => {
      try {
        offset = offset ? parseInt(offset) : 0
        limit = limit ? parseInt(limit) : 10
        const notifications = await osseus.db_models.notification.getUnread(filter, offset, limit)
        resolve(notifications)
      } catch (err) {
        reject(err)
      }
    })
  }

  notification.markAsRead = (notificationIds) => {
    return new Promise(async (resolve, reject) => {
      try {
        let ids
        if (typeof notificationIds === 'string') {
          ids = notificationIds.split(',')
        } else if (Array.isArray(notificationIds)) {
          ids = notificationIds
        } else {
          return reject(new Error(`not string/array`))
        }
        const result = await osseus.db_models.notification.markAsRead(ids)
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
  }

  return notification
}
