module.exports = (osseus) => {
  return {
    /**
     * @apiDefine NotificationResponse
     * @apiSuccess {String} id notification unique id.
     * @apiSuccess {String} createdAt notification creation time.
     * @apiSuccess {String} updatedAt notification last update time.
     * @apiSuccess {String} type notification type.
     * @apiSuccess {String} level notification severity level.
     * @apiSuccess {String} [community] community unique id the notification relates to.
     * @apiSuccess {String} [title] notification title text.
     * @apiSuccess {String} [content] notification content text.
     * @apiSuccess {Object} [data] notification data.
     * @apiSuccess {String} read false if notification is unread, otherwise time the notification was read.

     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "id": "5bf6a7828f86a54ffe3a58d3",
     *      "createdAt": "2018-11-22T12:56:34.660Z",
     *      "updatedAt": "2018-11-22T12:56:34.660Z"
     *      "type": "GENERAL"
     *      "level": "INFO"
     *      "title": "The title"
     *      "content": "This is some content"
     *      "data": {...}
     *      "read": "2018-11-22T13:56:34.660Z"
     *     }

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */

    /**
     * @apiDefine JWT
     * @apiHeader {String} Authorization JWT token generated using OSSEUS_ROUTER_JWT_SECRET value from the config.
     * @apiHeaderExample {json} Header-Example:
     *  {
     *      "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJlZGVmYWNlYi1lYzIxLTRmZmQtOWQ5OS1mMTdiMmNiMDliNTEiLCJpYXQiOjE1NDAxMzEyODIsImV4cCI6MTU0MDEzNDg4Mn0.DrIdRXOPcqH_NSTs8aZ91-hpI2Tj04xgRoYxbpyr5ok"
     *  }
     */

    /**
     * @api {get} /api/notification/id/:id Get by id
     * @apiName GetNotificationById
     * @apiGroup Notification
     * @apiVersion 1.0.0
     *
     * @apiDescription Get notification by notification id
     *
     * @apiUse JWT
     *
     * @apiParam {String} id notification id.
     *
     * @apiUse NotificationResponse
     */
    get: async (req, res, next) => {
      osseus.lib.Notification.getById(req.params.id)
        .then(notification => { res.send(notification) })
        .catch(err => { next(err) })
    },

    /**
     * @api {get} /api/notification/unread Get unread notifications
     * @apiName GetUnreadNotifications
     * @apiGroup Notification
     * @apiVersion 1.0.0
     *
     * @apiDescription Get unread notifications by optional params
     *
     * @apiUse JWT
     *
     * @apiParam {Number} [offset] position of unread notifications to get - default 0.
     * @apiParam {Number} [limit] max number of unread notifications to get - default 10.
     * @apiParam {String} [type] get unread notifications of specific type.
     * @apiParam {String} [level] get unread notifications of specific severity level.
     * @apiParam {String} [communityId] get unread notifications for specific community unique id.
     *
     * @apiSuccess {Object[]} notifications array of unread notification objects.
     * @apiSuccess {String} notification.id notification unique id.
     * @apiSuccess {String} notification.createdAt notification creation time.
     * @apiSuccess {String} notification.updatedAt notification last update time.
     * @apiSuccess {String} notification.type notification type.
     * @apiSuccess {String} notification.level notification severity level.
     * @apiSuccess {String} notification.[community] community unique id the notification relates to.
     * @apiSuccess {String} notification.[title] notification title text.
     * @apiSuccess {String} notification.[content] notification content text.
     * @apiSuccess {Object} notification.[data] notification data.
     * @apiSuccess {String} notification.read false.
     * @apiSuccess {Number} total total amount of unread notifications.
     * @apiSuccess {Number} limit the number of unread notifications in this batch.
     * @apiSuccess {Number} offset position of unread notifications this batch started from.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "notifications": [
     *       {
     *        "id": "5bf6a7828f86a54ffe3a58d3",
     *        "createdAt": "2018-11-22T12:56:34.660Z",
     *        "updatedAt": "2018-11-22T12:56:34.660Z"
     *        "type": "GENERAL"
     *        "level": "INFO"
     *        "title": "The title"
     *        "content": "This is some content"
     *        "data": {...}
     *        "read": false
     *       },
     *       {
     *        "id": "5bf6a7828f86a54ffe3a58d7",
     *        "createdAt": "2018-11-22T12:58:45.660Z",
     *        "updatedAt": "2018-11-22T12:58:45.660Z"
     *        "type": "GENERAL"
     *        "level": "INFO"
     *        "title": "The title"
     *        "content": "This is some other content"
     *        "data": {...}
     *        "read": false
     *       }
     *      ],
     *      "total": 2,
     *      "limit": 2,
     *      "offset": 2
     *     }

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    unread: async (req, res, next) => {
      let type = req.query.type ? req.query.type.toUpperCase() : ''
      let level = req.query.level ? req.query.level.toUpperCase() : ''
      osseus.lib.Notification.getUnread({type: type, level: level, community: req.query.communityId}, req.query.offset, req.query.limit)
        .then(data => { res.send({notifications: data.docs, total: data.total, limit: data.limit, offset: data.offset}) })
        .catch(err => { next(err) })
    },

    /**
     * @api {put} /api/notification/mark-as-read Mark notifications as read
     * @apiName MarkNotificationsAsRead
     * @apiGroup Notification
     * @apiVersion 1.0.0
     *
     * @apiDescription Mark one or more notifications as read
     *
     * @apiUse JWT
     *
     * @apiParam {String/String[]} ids one or more notification unique ids.
     *
     * @apiSuccess {Number} found number of unread notifications found for provided ids.
     * @apiSuccess {Number} updated number of unread notifications updated for provided ids.
     *
     * @apiSuccessExample Success Example
     *     HTTP/1.1 200 OK
     *     {
     *      "found": 2,
     *      "updated": 2
     *     }

     * @apiErrorExample Error Example
     *     HTTP/1.1 500 Internal Server Error
     *     {
     *       "error": "The error description"
     *     }
     */
    markAsRead: async (req, res, next) => {
      osseus.lib.Notification.markAsRead(req.body.ids)
        .then(data => { res.send(data) })
        .catch(err => { next(err) })
    }
  }
}
