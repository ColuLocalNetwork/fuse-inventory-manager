module.exports = (osseus) => {
  function notification () {}

  const create = (level, type, community, title, content, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        const notification = await osseus.db_models.notification.create({level: level, type: type, community: community, title: title, content: content, data: data})
        // TODO
        resolve(notification)
      } catch (err) {
        reject(err)
      }
    })
  }

  notification.create = create

  osseus.db_models.notification.levels.forEach(level => {
    notification[level.toLowerCase()] = (type, community, title, content, data) => create(level, type, community, title, content, data)
  })

  return notification
}
