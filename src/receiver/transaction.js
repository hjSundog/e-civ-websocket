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
              if (client.name !== tMessage.data.to) {
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
              if (client.name !== tMessage.data.to) {
                return
              }
              client.send(JSON.stringify(tMessage))
            }
          })
          break
        }
        case 'cancle': {
          const index = ws.invitees.findIndex((invitee) => {
            if (invitee.name === tMessage.data.to) {
              invitee.send(JSON.stringify(tMessage))
              return true
            }
          })
          ws.invitees.splice(index, 1)
          break
        }
        case 'trade': {
          // 有两种考虑：1，客户端维持一个是否已经发起交易请求的状态，服务器将数据发送至客户端检查该状态，如果发起了，才表示交易成功，
          // 2.服务器为每个交易维护一个Set集
          // 这里采用第二种方法吧：

          // 获取客户端来的数据
          const from = tMessage.data.from
          const to = tMessage.data.to
          // 考虑搞个算法，只要生成字符串是相通的，返回值也相同，不这样颠倒判断
          const fromTo = `${from}@${to}`
          const toFrom = `${to}@${from}`
          if (wss.tradeMap[toFrom]) {
            // 对方已经应答
            wss.tradeMap[toFrom] = {
              [from]: {
                items: tMessage.data.items,
                extra: tMessage.data.extra
              }
            }
            // 分别给两方发送结果
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                if (client.name !== tMessage.data.to && client.name !== tMessage.data.from) {
                  return
                }
                console.log('send data to:--> ' + client.name)
                client.send(JSON.stringify(wss.tradeMap[toFrom][client.name]))
              }
            })
          } else {
            wss.tradeMap[fromTo] = {
              [from]: {
                items: tMessage.data.items,
                extra: tMessage.data.extra
              }
            }
          }


          break
        }
        case 'close': {
          break
        }
        default: {
          
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
        souce: 'person',
        type: 'invitation',
        data: {
          payload: {
            invator: 'mdzsz',
            level: 10
          },
          from: ws.name,
          to: 'admin',
          message: '挂了挂了',
          operation: 'close'
        },
        created_at: new Date().toLocaleDateString()
      }))
    })
    logger.log('disconnected')
  })
}
