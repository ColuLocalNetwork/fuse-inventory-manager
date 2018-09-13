module.exports = {
  DEBUG: false,
  OSSEUS_LOGGER_LOG_LEVEL: 'debug',
  OSSEUS_SERVER_DEPENDENCIES: ['logger', 'mongo'],
  OSSEUS_SERVER_PORT: '8080',
  OSSEUS_SERVER_MORGAN_FORMAT: ':date[iso] method=":method", url=":url", statusCode=":status", route=":route", host=":host", client-ip=":client-ip", user-agent=":user-agent", httpVersion=":http-version", responseTime=":response-time"',
  OSSEUS_SERVER_ADD_HEALTHCHECK: true,
  OSSEUS_SERVER_ADD_IS_RUNNING: true,
  OSSEUS_ROUTER_DEPENDENCIES: ['logger', 'server'],
  OSSEUS_ROUTER_ROUTES_PATH: '/app/routes',
  OSSEUS_ROUTER_CONTROLLERS_PATH: '/app/controllers',
  OSSEUS_ROUTER_POLICY_PATH: '/app/middlewares',
  OSSEUS_ROUTER_URL_PREFIX: '/api',
  OSSEUS_MONGO_DEPENDENCIES: ['logger'],
  CLN_ADDRESS: '0x4162178B78D6985480A308B2190EE5517460406D',
  CLN_ABI: require('./abi/ColuLocalNetwork'),
  BLOCKS_TO_FINALIZE_BCTX: 20
}
