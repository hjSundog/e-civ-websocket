module.exports = function (ws, wss, WebSocket) {
  // 收到邀请交易请求,将该对象加入被邀请组中
  // ws-wrapper之后client永远不可能等于ws
  ws.on('message', function (message) {
    let tMessage = JSON.parse(message.data)
    if (!tMessage.type) {
      console.log('init type: ' + tMessage)
      return
    }
    if (tMessage.type === 'INVITATION') {
      switch (tMessage.data.operation) {
        case 'invite': {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              if (client.name !== tMessage.target) {
                return
              }
              ws.invitees.push(client)
              client.send(JSON.stringify(tMessage))
            }
          })
          break
        }
        case 'refuse': {
          // ws.invitees.forEach((client) => {
          //   if (client.uuid !== tMessage.target) {
          //     return
          //   }

          // })
          break
        }
        case 'close': {

        }
      }

    } else if (tMessage.type === 'RADIO') {

    } else {

    }
  })
  // 连接中断请求处理,refuse
  ws.on('close', function close () {
    ws.inviters.forEach((inviter) => {
      inviter.send(JSON.stringify({
        souce: {
          invator: 'mdzsz',
          level: 10
        },
        type: 'invitation',
        target: 'me',
        data: {
          message: '挂了挂了',
          operation: 'close'
        },
        created_at: new Date().toLocaleDateString()
      }))
    })
    logger.log('disconnected')
  })
}
