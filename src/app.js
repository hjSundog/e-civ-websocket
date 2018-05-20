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
const kafka = require('kafka-node')

const publicKey = fs.readFileSync(path.join(__dirname, '../publicKey.pub'))

global.logger = customizedLogger

mongoose.connect(DBConfig.url, {
  useMongoClient: true
})
mongoose.connection.on('connected', () => {
  console.log('Mongoose connection open to ' + DBConfig.url)
})
mongoose.connection.on('error', console.error)

const client = new kafka.KafkaClient()
const Consumer = kafka.Consumer
const consumer = new Consumer(client, [
  { topic: 'websocket-api', partition: 0 }
], {
  autoCommit: false, fetchMaxWaitMs: 1000, fetchMaxBytes: 1024 * 1024
})

consumer.on('message', function (message) {
  console.log('kafka message: ', message)
})

consumer.on('error', function (err) {
  console.log('kafka error: ', err)
})

const wss = new WebSocket.Server({
  host: SystemConfig.WEBSOCKET_server_host,
  port: SystemConfig.WEBSOCKET_server_port,
  // 验证token识别身份
  verifyClient: (info) => {
    const token = url.parse(info.req.url, true).query.token
    let user
    // 如果token过期会爆TokenExpiredError
    try {
      user = jwt.verify(token, publicKey)
      console.log(user.name + ' validate!')
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

wss.tradeMap = new Map()
wss.confirmMap = new Map()
// 这里先在服务器存储拍卖物品，以后使用TTL在moongodb中设置结束时间即可
// item JSON :
// {
//   name:"",
//   owner_id: '',
//   type: '',
//   icon: '',
//   details: {

//   }
//   startTime: 0,
//   endTime: 0,
// }
wss.auctionItems = {
  // '1527782400000': [
  //   {
  //     id: '1519973840193@张珊珊',
  //     item: {
  //       name: '白菜'
  //     },
  //     count: 1,
  //     startTime: 1519973840193,
  //     endTime: 1527782400000,
  //     from: {
  //       payload: {
  //         name: '张珊珊',
  //         level: 13
  //       },
  //       price: 32
  //     }
  //   },
  //   {
  //     id: '1519973843993@宋丹丹',
  //     item: {
  //       name: '牛肉'
  //     },
  //     count: 1,
  //     startTime: 1519973843993,
  //     endTime: 1527782400000,
  //     from: {
  //       payload: {
  //         name: '宋丹丹',
  //         level: 45
  //       },
  //       price: 32
  //     }
  //   }
  // ]
}

wss.on('connection', function connection (ws, req) {
  ws.isAlive = true
  ws.on('pong', heartbeat)
  // 使用用户名来区分websocket，这点很重要
  ws.name = req.user.name
  // ws.uuid = 'me' // uuid.v4()
  // 带来一定隐患，比如事件机制不一样。。。
  ws = new WebSocketWrapper(ws)
  // invites 自己发起的的邀请对象数组,用于管理邀请求
  ws.inviters = []
  // invited 邀请自己的用户数组，用于决定是否回应邀请者
  ws.invitees = []
  const user = req.user
  console.log(user)

  // message handler receiver
  receiver.default(ws) // 主频道
  receiver.chatChannels(ws) // 聊天分频道
  receiver.transaction(ws, wss, WebSocket) // 交易处理
  receiver.auction(ws, wss, WebSocket) // 拍卖处理
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
