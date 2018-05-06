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
        // 搜索其他在线用户
        case 'search': {
          let arr = []
          if (tMessage.data.to) {
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                if (client.name.match(tMessage.data.to) !== null) {
                  arr.push(client.name)
                }
              }
            })
          }
          tMessage.data.to = arr
          ws.send(JSON.stringify(tMessage))
          break
        }
        // 确定是否交易
        case 'confirm': {
          const from = tMessage.data.from
          const to = tMessage.data.to
          // 考虑搞个算法，只要生成字符串是相通的，返回值也相同，不这样颠倒判断
          const fromTo = `${from}@${to}`
          const toFrom = `${to}@${from}`
          if (wss.tradeMap[toFrom]) {
            // 进行数据库操作
            // const one = wss.tradeMap[toFrom][from] // the last confirm
            // const two = wss.tradeMap[toFrom][to] // the first confirm
            // 对方已经应答
            wss.tradeMap[toFrom] = {
              ...wss.tradeMap[toFrom],
              [from]: {
                items: tMessage.data.items,
                extra: tMessage.data.extra
              }
            }
            // 分别给两方发送确定消息
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                if (client.name !== tMessage.data.to && client.name !== tMessage.data.from) {
                  return
                }
                const sendData = {
                  source: 'preson',
                  type: 'INVITATION',
                  data: {
                    from: client.name === from ? to : from,
                    to: client.name,
                    operation: 'confirm',
                    message: '确不确定啊，这笔交易很好的！'
                  },
                  created_at: new Date().toLocaleDateString()
                }
                client.send(JSON.stringify(sendData))
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
        // 确定过程中一方不同意交易，交易挂起
        case 'hang_up': {
          const from = tMessage.data.from
          const to = tMessage.data.to
          // 考虑搞个算法，只要生成字符串是相通的，返回值也相同，不这样颠倒判断
          const fromTo = `${from}@${to}`
          const toFrom = `${to}@${from}`
          if (wss.confirmMap.has(fromTo)) {
            wss.confirmMap.delete(fromTo)
          }

          if (wss.confirmMap.has(toFrom)) {
            wss.confirmMap.delete(toFrom)
          }
          // 发送取消交易消息
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
        case 'trade': {
          // 获取客户端来的数据
          const from = tMessage.data.from
          const to = tMessage.data.to
          // 考虑搞个算法，只要生成字符串是相通的，返回值也相同，不这样颠倒判断
          const fromTo = `${from}@${to}`
          const toFrom = `${to}@${from}`
          if (wss.confirmMap[toFrom]) {
            // 对方已经应答
            // 分别给两方发送结果
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                if (client.name !== tMessage.data.to && client.name !== tMessage.data.from) {
                  return
                }
                const data = wss.confirmMap[toFrom][client.name]
                const sendData = {
                  source: 'preson',
                  type: 'INVITATION',
                  data: {
                    from: client.name === from ? to : from,
                    to: client.name,
                    items: data.items,
                    extra: data.extra,
                    operation: 'trade'
                  },
                  created_at: new Date().toLocaleDateString()
                }
                client.send(JSON.stringify(sendData))
              }
            })
            // 清除
            wss.confirmMap.delete(toFrom)
            wss.tradeMap.delete(toFrom)
          } else {
            wss.confirmMap[fromTo] = wss.tradeMap[fromTo]
          }
          break
        }
        // 一端操作背包时将该数据实时显示到另一端
        case 'trading': {
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
