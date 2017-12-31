
module.exports = function (ws) {
  ws.on('message', function incoming (message) {
    // 过滤心跳监测的信息
    // TODO: 写一下逻辑分发
    if (message === '@heart') {
      return
    }
    logger.info('received: %s', message)
  })
}
