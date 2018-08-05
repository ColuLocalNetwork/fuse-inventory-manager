module.exports = {
  DEBUG: 'false',
  OSSEUS_LOGGER_LOG_LEVEL: 'silly',
  OSSEUS_SERVER_DEPENDENCIES: ['logger', 'mongo'],
  OSSEUS_SERVER_PORT: '8080',
  OSSEUS_SERVER_MORGAN_FORMAT: ':date[iso] method=":method", url=":url", statusCode=":status", route=":route", host=":host", client-ip=":client-ip", user-agent=":user-agent", request-id=":request-id", httpVersion=":http-version", responseTime=":response-time"',
  OSSEUS_ROUTER_DEPENDENCIES: ['logger', 'server'],
  OSSEUS_ROUTER_ROUTES_PATH: '/app/routes',
  OSSEUS_ROUTER_CONTROLLERS_PATH: '/app/controllers',
  OSSEUS_ROUTER_POLICY_PATH: '/app/middlewares',
  OSSEUS_ROUTER_URL_PREFIX: '/api',
  OSSEUS_MONGO_DEPENDENCIES: ['logger'],
  OSSEUS_MONGO_URI: 'mongodb://localhost/inventory-manager'
}
