const SystemConfig = require('./config').System
const DBConfig = require('./config').DB
const path = require('path')
const url = require('url')
const WebSocket = require('ws')
const WebSocketWrapper = require('./wrapper/wrapper')
const receiver = require('./receiver')
const customizedLogger = require('./tool/customized-winston-logger')
// const uuid = require('uuid')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const mongoose = require('mongoose')
const setInterval = require('timers').setInterval

const publicKey = fs.readFileSync(path.join(__dirname, '../publicKey.pub'))

global.logger = customizedLogger

mongoose.connect(DBConfig.url, {
  useMongoClient: true
})
mongoose.connection.on('connected', () => {
  console.log('Mongoose connection open to ' + DBConfig.url)
})
mongoose.connection.on('error', console.error)

// const env = process.env.NODE_ENV || 'development' // Current mode

// const payloads = [{
//   meta: {
//     age: 21,
//     sex: 'male'
//   },
//   name: '3',
//   person_id: null,
//   username: '3'
// }, {
//   meta: {
//     age: 21,
//     sex: 'male'
//   },
//   name: '2',
//   person_id: null,
//   username: '2'
// }, {
//   meta: {
//     age: 21,
//     sex: 'male'
//   },
//   name: '5',
//   person_id: null,
//   username: '5'
// }, {
//   meta: {
//     age: 21,
//     sex: 'male'
//   },
//   name: '6',
//   person_id: null,
//   username: '6'
// }]

// let rt = payloads.map(payload => {
//   return jwt.sign(payload, publicKey)
// })
// console.log(rt)

const wss = new WebSocket.Server({
  host: SystemConfig.WEBSOCKET_server_host,
  port: SystemConfig.WEBSOCKET_server_port,
  // 验证token识别身份
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
function heartbeat (data) {
  this.isAlive = true
}

wss.on('connection', function connection (ws, req) {
  ws.isAlive = true
  ws.on('pong', heartbeat)
  ws.name = req.user.name
  // ws.uuid = 'me' // uuid.v4()
  // 带来一定隐患，比如事件机制不一样。。。
  ws = new WebSocketWrapper(ws)
  // invites 发起的的邀请者
  ws.inviters = []
  // invited 被邀请者
  ws.invitees = []
  const user = req.user
  console.log(user)

  // message handler receiver
  receiver.default(ws) // 主频道
  receiver.chatChannels(ws) // 聊天分频道
  receiver.transaction(ws, wss, WebSocket) // 交易处理
})

setInterval(function ping () {
  wss.clients.forEach((ws) => {
    logger.info('heartbeat scan')
    if (ws.isAlive === false) {
      logger.info('loss connect')
      return ws.terminate()
    }

    ws.isAlive = false
    ws.ping('ping', false, false)
  })
}, 5000)
