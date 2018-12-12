const timestamps = require('mongoose-time')
const pagination = require('mongoose-paginate')

module.exports = (osseus) => {
  const db = osseus.mongo
  const Schema = db.mongoose.Schema

  const NOTIFICATION_TYPES = ['SYSTEM', 'GENERAL', 'API', 'JOB', 'LISTENER', 'TRANSFER_EVENT', 'BLOCKCHAIN']
  const NOTIFICATION_LEVELS_MAP = {'INFO': 1, 'WARNING': 2, 'CRITICAL': 3}
  const NOTIFICATION_LEVELS = Object.keys(NOTIFICATION_LEVELS_MAP)

  const NotificationSchema = new Schema({
    type: {type: String, enum: NOTIFICATION_TYPES, default: 'GENERAL'},
    level: {type: String, enum: NOTIFICATION_LEVELS, default: 'INFO'},
    community: {type: Schema.Types.ObjectId, ref: 'Community'},
    title: {type: String},
    content: {type: String},
    data: {type: db.mongoose.Schema.Types.Mixed},
    read: {type: Date, default: null}
  }).plugin(timestamps()).plugin(pagination)

  NotificationSchema.index({type: 1, level: 1, community: 1})

  NotificationSchema.set('toJSON', {
    getters: true,
    virtuals: true,
    transform: (doc, ret, options) => {
      const safeRet = {
        id: ret._id.toString(),
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
        type: ret.type,
        level: ret.level,
        community: ret.community,
        title: ret.title,
        content: ret.content,
        data: ret.data,
        read: !!ret.read
      }
      return safeRet
    }
  })

  const Notification = db.model('Notification', NotificationSchema)

  function notification () {}

  notification.create = (data) => {
    return new Promise((resolve, reject) => {
      const notification = new Notification(data)
      notification.save((err, newObj) => {
        if (err) {
          return reject(err)
        }
        if (!newObj) {
          return reject(new Error('Notification not saved'))
        }
        resolve(newObj)
      })
    })
  }

  notification.markAsRead = (ids) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(ids)) ids = [ids]
      const condition = {_id: {$in: ids}, read: null}
      const update = {$set: {read: new Date()}}
      Notification.updateMany(condition, update, {new: true}, (err, raw) => {
        if (err) {
          return reject(err)
        }
        if (!raw || !raw.ok) {
          return reject(new Error(`Could not mark notifications as read`))
        }
        resolve({
          found: raw.n,
          updated: raw.nModified
        })
      })
    })
  }

  notification.getById = (id) => {
    return new Promise((resolve, reject) => {
      Notification.findById(id, (err, doc) => {
        if (err) {
          return reject(err)
        }
        if (!doc) {
          return reject(new Error(`Notification not found for id ${id}`))
        }
        resolve(doc)
      })
    })
  }

  notification.getUnread = (filter, offset, limit) => {
    return new Promise((resolve, reject) => {
      offset = offset || 0
      limit = limit || 10
      const query = {read: null}
      if (filter) ['type', 'level', 'community'].filter(k => filter[k]).forEach(k => { query[k] = filter[k] })
      Notification.paginate(query, {offset: offset, limit: limit}, (err, result) => {
        if (err) {
          return reject(err)
        }
        resolve(result)
      })
    })
  }

  notification.isBelowLevel = (levelKey1, levelKey2) => levelKey1 && levelKey2 && NOTIFICATION_LEVELS_MAP[levelKey1] < NOTIFICATION_LEVELS_MAP[levelKey2]

  notification.levels = NOTIFICATION_LEVELS

  notification.getModel = () => {
    return Notification
  }

  return notification
}
