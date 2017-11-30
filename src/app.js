import {
  System as SystemConfig,
  DB as DBConfig
} from './config'
import path from 'path'
import url from 'url'
import WebSocket from 'ws'
import customizedLogger from './tool/customized-winston-logger'

import jwt from 'jsonwebtoken'
import fs from 'fs'
import mongoose from 'mongoose'
// import PluginLoader from './lib/PluginLoader'

const publicKey = fs.readFileSync(path.join(__dirname, '../publicKey.pub'))

global.logger = customizedLogger

mongoose.connect(DBConfig.url)
mongoose.connection.on('connected', () => {
  console.log('Mongoose connection open to ' + DBConfig.url)
})
mongoose.connection.on('error', console.error)

// const env = process.env.NODE_ENV || 'development' // Current mode

const wss = new WebSocket.Server({
  host: 'localhost',
  port: 8089,
  verifyClient: (info) => {
    const token = url.parse(info.req.url, true).query.token
    var user = jwt.verify(token, publicKey)
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
