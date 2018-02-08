const SystemConfig = require('./config').System
const DBConfig = require('./config').DB
const path = require('path')
const url = require('url')
const WebSocket = require('ws')
const WebSocketWrapper = require('./wrapper/wrapper')
const receiver = require('./receiver')
const customizedLogger = require('./tool/customized-winston-logger')

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

wss.recieveTypes = {
  'INVATATION': 'INVATATION',
  'RADIO': 'RADIO'
}

wss.on('connection', function connection (ws, req) {
  ws.isAlive = true
  ws.on('pong', heartbeat)

  // 带来一定隐患，比如事件机制不一样。。。
  ws = new WebSocketWrapper(ws)
  ws.invitators = new Set()
  const user = req.user
  console.log(user)

  // message handler receiver
  receiver.default(ws) // 主频道
  receiver.chatChannels(ws) // 聊天分频道

  // 收到邀请交易请求
  ws.on('message', function (message) {
    console.log('mddzz: ' + message.data.type)
    if (!message.data.type) {
      console.log('init type: ' + message.data)
      return
    }
    switch (message.data.type) {
      case wss.recieveTypes.INVATATION :
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            if (client.name !== message.data.target) {
              return
            }
            ws.invitators.add(client)
            client.send(JSON.stringify(message.data))
          }
        })
        break
      case wss.recieveTypes.RADIO:
        break
      default:
    }
  })
  // 这里模拟4个人['吕飞', 'lwio', 'break', 'inferno']发送邀请交易
  let invators = ['吕飞', 'lwio', 'break', 'inferno']
  let payloads = ['约不？', '哈哈', '大大大大', '一如既往的mdzz']
  invators.forEach((nvt) => {
    ws.send(JSON.stringify({
      type: wss.recieveTypes.INVATATION,
      target: 'me',
      payload: payloads[Math.floor(Math.random() * payloads.length)]
    }))
  })

  ws.on('close', function close () {
    ws.invitators.forEach((invitator) => {
      invitator.send(JSON.stringify({
        type: 'CANCELINVITATION',
        payload: '我溜了哈哈'
      }))
    })
    logger.log('disconnected')
  })
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
