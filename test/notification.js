const OsseusHelper = require('./helpers/osseus')
const expect = require('chai').expect

const ColuLocalNetwork = artifacts.require('cln-solidity/contracts/ColuLocalNetwork.sol')
const CurrencyFactory = artifacts.require('cln-solidity/contracts/CurrencyFactory.sol')
const EllipseMarketMakerLib = artifacts.require('cln-solidity/contracts/EllipseMarketMakerLib.sol')

const TOKEN_DECIMALS = 10 ** 18
const CLN_MAX_TOKENS = 15 * 10 ** 8 * TOKEN_DECIMALS
const CC_MAX_TOKENS = 15 * 10 ** 6 * TOKEN_DECIMALS

contract('NOTIFICATION', async (accounts) => {
  let osseus

  let cln

  let currencyFactory

  let currencyAddress

  let currencyBlockchainInfo

  let currency
  let community

  const validateNotification = (notification1, notification2, type, level, isRead) => {
    expect(notification1).to.be.a('Object')
    expect(notification1.id).to.be.a('string')
    if (notification2 && notification2.id) expect(notification1.id).to.equal(notification2.id)
    expect(notification1.type).to.equal((notification2 && notification2.type) || type || 'GENERAL')
    expect(notification1.level).to.equal((notification2 && notification2.level) || level || 'INFO')
    if (notification2 && notification2.community) expect(notification1.community.toString()).to.equal(notification2.community.toString())
    if (notification1.title) expect(notification1.title).to.be.a('string')
    if (notification2 && notification2.title) expect(notification1.title).to.equal(notification2.title)
    if (notification1.content) expect(notification1.content).to.be.a('string')
    if (notification2 && notification2.content) expect(notification1.content).to.equal(notification2.content)
    if (notification1.data && Object.keys(notification1.data)) expect(notification1.data).to.be.a('Object')
    if (notification2 && notification2.data) expect(notification1.data).to.deep.equal(notification2.data)
    if (!isRead) { expect(notification1.read).to.be.null } else { expect(notification1.read).not.to.be.null }
    if (notification2 && notification2.read) expect(notification1.read).to.equal(notification2.read)
  }

  before(async function () {
    this.timeout(60000)

    const mmLib = await EllipseMarketMakerLib.new()

    cln = await ColuLocalNetwork.new(CLN_MAX_TOKENS)
    await cln.makeTokensTransferable()

    currencyFactory = await CurrencyFactory.new(mmLib.address, cln.address, {from: accounts[0]})
    const result = await currencyFactory.createCurrency('TestLocalCurrency', 'TLC', 18, CC_MAX_TOKENS, 'ipfs://hash', {from: accounts[0]})
    currencyAddress = result.logs[0].args.token
    currencyBlockchainInfo = {
      blockHash: result.logs[0].blockHash,
      blockNumber: result.logs[0].blockNumber,
      transactionHash: result.logs[0].transactionHash
    }

    osseus = await OsseusHelper()
  })

  beforeEach(async function () {
    osseus.helpers.clearDB()

    currency = await osseus.lib.Currency.create(currencyAddress, osseus.config.abi.CommunityCurrency, currencyBlockchainInfo, osseus.helpers.randomStr(10))
    community = await osseus.lib.Community.create('Test Community', currency, osseus.helpers.randomStr(10))
  })

  it('should create a notification', async () => {
    let notification = await osseus.db_models.notification.create({community: community.id, title: 'Test', content: 'Some content', data: {a: 1, b: 2, c: {d: 3, e: 4}}})
    validateNotification(notification)
  })

  it('should create notifications for all levels', async () => {
    let notification1 = await osseus.db_models.notification.INFO({community: community.id, title: 'Test INFO'})
    validateNotification(notification1, undefined, undefined, 'INFO')
    let notification2 = await osseus.db_models.notification.WARNING({community: community.id, title: 'Test WARNING'})
    validateNotification(notification2, undefined, undefined, 'WARNING')
    let notification3 = await osseus.db_models.notification.CRITICAL({community: community.id, title: 'Test CRITICAL'})
    validateNotification(notification3, undefined, undefined, 'CRITICAL')
  })

  it('should create multiple notifications', async () => {
    for (let i = 1; i <= osseus.helpers.randomNumNotZero(100); i++) {
      await osseus.db_models.notification.create({level: osseus.db_models.notification.levels[osseus.helpers.randomNum(3)], community: community.id, title: `Test ${i}`})
    }
  })

  it('should get a notification by id', async () => {
    let notification1 = await osseus.db_models.notification.create({community: community.id, title: 'Test', content: 'Some content', data: {a: 1, b: 2, c: {d: 3, e: 4}}})
    let notification2 = await osseus.db_models.notification.getById(notification1.id)
    validateNotification(notification1, notification2)
  })

  it('should mark one notification as read', async () => {
    let notification = await osseus.db_models.notification.create()
    let result = await osseus.db_models.notification.markAsRead(notification.id)
    expect(result).to.be.a('Object')
    expect(result.found).to.equal(1)
    expect(result.updated).to.equal(1)
  })

  it('should get all unread notifications (with different filters)', async () => {
    let nWARNING = osseus.helpers.randomNumNotZero(100)
    let nCRITICAL = osseus.helpers.randomNumNotZero(100)
    let nWithCommunity = osseus.helpers.randomNumNotZero(100)
    let notifications = {levelWarning: [], levelCritical: [], withCommunity: []}

    for (let i = 1; i <= nWARNING; i++) {
      let notification = await osseus.db_models.notification.create({level: 'WARNING'})
      notifications.levelWarning.push(notification.id)
    }
    for (let i = 1; i <= nCRITICAL; i++) {
      let notification = await osseus.db_models.notification.create({level: 'CRITICAL'})
      notifications.levelCritical.push(notification.id)
    }
    for (let i = 1; i <= nWithCommunity; i++) {
      let notification = await osseus.db_models.notification.create({community: community.id})
      notifications.withCommunity.push(notification.id)
    }

    let notificationsWARNING = await osseus.db_models.notification.getUnread({level: 'WARNING'}, 0, 100)
    let notificationsCRITICAL = await osseus.db_models.notification.getUnread({level: 'CRITICAL'}, 0, 100)
    let notificationsWithCommunity = await osseus.db_models.notification.getUnread({level: 'INFO', community: community.id}, 0, 100)

    expect(notificationsWARNING.docs.length).to.equal(nWARNING)
    expect(notificationsWARNING.docs.map(doc => doc.id)).to.deep.equal(notifications.levelWarning)
    expect(notificationsCRITICAL.docs.length).to.equal(nCRITICAL)
    expect(notificationsCRITICAL.docs.map(doc => doc.id)).to.deep.equal(notifications.levelCritical)
    expect(notificationsWithCommunity.docs.length).to.equal(nWithCommunity)
    expect(notificationsWithCommunity.docs.map(doc => doc.id)).to.deep.equal(notifications.withCommunity)
  })

  it('should mark multiple notifications as read', async () => {
    let notificationIds = []
    for (let i = 1; i <= osseus.helpers.randomNumNotZero(100); i++) {
      let notification = await osseus.db_models.notification.create({level: osseus.db_models.notification.levels[osseus.helpers.randomNum(3)], community: community.id, title: `Test ${i}`})
      notificationIds.push(notification.id)
    }
    let result = await osseus.db_models.notification.markAsRead(notificationIds)
    expect(result.found).to.equal(notificationIds.length)
    expect(result.updated).to.equal(notificationIds.length)
  })

  it('should mark only unread notifications as read', async () => {
    let notificationIds = []
    let notificationIdsMarkedAsRead = []
    for (let i = 1; i <= osseus.helpers.randomNumNotZero(100); i++) {
      let notification = await osseus.db_models.notification.create({level: osseus.db_models.notification.levels[osseus.helpers.randomNum(3)], community: community.id, title: `Test ${i}`})
      notificationIds.push(notification.id)
      if (i % 2) {
        await osseus.db_models.notification.markAsRead(notification.id)
        notificationIdsMarkedAsRead.push(notification.id)
      }
    }
    let result = await osseus.db_models.notification.markAsRead(notificationIds)
    expect(result.found).to.equal(notificationIds.length - notificationIdsMarkedAsRead.length)
    expect(result.updated).to.equal(notificationIds.length - notificationIdsMarkedAsRead.length)
  })

  after(async function () {
    osseus.helpers.clearDB()
  })
})
