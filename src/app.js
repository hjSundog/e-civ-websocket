const SystemConfig = require('./config').System
const DBConfig = require('./config').DB
const path = require('path')
const url = require('url')
const WebSocket = require('ws')
const customizedLogger = require('./tool/customized-winston-logger')

const jwt = require('jsonwebtoken')
const fs = require('fs')
const mongoose = require('mongoose')
const setInterval = require('timers').setInterval

const publicKey = fs.readFileSync(path.join(__dirname, '../publicKey.pub'))

global.logger = customizedLogger

mongoose.connect(DBConfig.url)
mongoose.connection.on('connected', () => {
  console.log('Mongoose connection open to ' + DBConfig.url)
})
mongoose.connection.on('error', console.error)

// const env = process.env.NODE_ENV || 'development' // Current mode

const wss = new WebSocket.Server({
  host: SystemConfig.WEBSOCKET_server_host,
  port: SystemConfig.WEBSOCKET_server_port,
  verifyClient: (info) => {
    const token = url.parse(info.req.url, true).query.token
    let user
    console.log('start validate')
    // 如果token过期会爆TokenExpiredError
    try {
      user = jwt.verify(token, publicKey)
    } catch (e) {
      return false
    }

    // verify token and parse user object
    if (user) {
      info.req.user = user
      return true
    } else {
      return false
    }
  }
  // perMessageDeflate: true,
})

// 心跳监测监测连接断连
function heartbeat () {
  this.isAlive = true
}

wss.on('connection', function connection (ws, req) {
  const user = req.user
  console.log(user)
  ws.isAlive = true

  // 测试聊天室用
  let id = 0
  setInterval(() => {
    console.log('send chat test')
    try {
      ws.send(JSON.stringify({
        id: id,
        content: '我是一个服务器端发出来的消息'
      }))
    } catch (e) {
      console.log(e)
      ws.terminate()
    }
    id++
  }, 1000)

  ws.on('pong', heartbeat)

  ws.on('message', function incoming (message) {
    // 过滤心跳监测的信息
    // TODO: 写一下逻辑分发
    if (message === '@heart') {
      return
    }
    logger.info('received: %s', message)
    ws.send(`echo: ${message}`)
  })

  ws.on('close', function close () {
    logger.log('disconnected')
  })

  ws.send('connect start')
})

setInterval(function ping () {
  wss.clients.forEach((ws) => {
    logger.info('heartbeat scan')
    if (ws.isAlive === false) {
      logger.info('loss connect')
      return ws.terminate()
    }

    ws.isAlive = false
    ws.ping('', false, true)
  })
}, 3000)
