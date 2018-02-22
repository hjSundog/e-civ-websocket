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
              if (client.name !== tMessage.to) {
                return
              }
              ws.invitees.push(client)
              client.send(JSON.stringify(tMessage))
            }
          })
          break
        }
        case 'refuse':
        case 'receive': {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              if (client.name !== tMessage.to) {
                return
              }
              client.send(JSON.stringify(tMessage))
            }
          })
          break
        }
        case 'cancle': {
          const index = ws.invitees.findIndex((invitee) => {
            if (invitee.name === tMessage.to) {
              invitee.send(JSON.stringify(tMessage))
              return true
            }
          })
          ws.invitees.splice(index, 1)
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
        from: ws.name,
        souce: {
          invator: 'mdzsz',
          level: 10
        },
        type: 'invitation',
        to: 'me',
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
