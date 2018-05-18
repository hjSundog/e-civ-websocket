function adaptor (data) {
  const {payload, auctionItem, message} = data
  // 先使用startTime@name 的形式作为id
  return {
    id: auctionItem.startTime + '@' + auctionItem.holder.nickname,
    item: {
      ...auctionItem.item
    },
    message: message,
    count: auctionItem.count,
    startTime: auctionItem.startTime,
    endTime: auctionItem.endTime,
    holder: auctionItem.holder,
    from: {
      payload: {
        ...payload
      },
      price: auctionItem.price
    }
  }
}

function selectAuctionItem (items, endTime, id) {
  const endTimeDatas = items[endTime]
  const rt = endTimeDatas.find((item) => {
    return item.id === id
  })
  return rt
}

function updateAuctionItem (AuctionItems, endTime, id, update) {
  const {price} = update
  const data = selectAuctionItem(AuctionItems, endTime, id)
  if (data.from.price < price) {
    data.from = update
  }
}

module.exports = function (ws, wss, WebSocket) {
  ws.on('message', function (message) {
    const tMessage = JSON.parse(message.data)
    const fromData = tMessage.data.auctionItem
    if (!tMessage.type) {
      console.log('init type: ' + tMessage)
      return
    }
    if (tMessage.type === 'AUCTION') {
      switch (tMessage.data.operation) {
        case 'init': {
          const items = Object.entries(wss.auctionItems).map(([key, value]) => {
            return value
          }).reduce((holder, cur) => {
            holder = [...holder, ...cur]
            return holder
          }, [])
          ws.send(JSON.stringify({
            source: 'system',
            type: 'AUCTION',
            data: {
              operation: 'init',
              items: items
            },
            created_at: new Date().toLocaleDateString()
          }))
          break
        }
        case 'sell': {
          const tData = adaptor(tMessage.data)
          if (wss.auctionItems[fromData.endTime]) {
            wss.auctionItems[fromData.endTime].push(tData)
          } else {
            wss.auctionItems[fromData.endTime] = [tData]
          }
          // 广播
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                source: 'system',
                type: 'AUCTION',
                data: {
                  operation: 'sell',
                  items: {
                    data: tData.item,
                    count: tData.count
                  }
                },
                created_at: new Date().toLocaleDateString()
              }))
            }
          })
          break
        }
        case 'makingBid': {
          const {from, message, item, endTime} = tMessage.data
          // const {payload, price} = from
          if (wss.auctionItems[endTime]) {
            // 更改
            updateAuctionItem(wss.auctionItems, endTime, item, from)
            // 广播
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const res = selectAuctionItem(wss.auctionItems, endTime, item)
                client.send(JSON.stringify({
                  source: 'system',
                  type: 'AUCTION',
                  data: {
                    message: '价格更新！',
                    operation: 'makingBid',
                    target: res
                  },
                  created_at: new Date().toLocaleDateString()
                }))
              }
            })
          } else {
            // 如果不存在该物品这不可以竞拍
            ws.send(JSON.stringify({
              source: 'system',
              type: 'AUCTION',
              data: {
                message: '你不可以竞拍不存在的物品！',
                operation: 'error'
              },
              created_at: new Date().toLocaleDateString()
            }))
          }
          break
        }
        default:
      }
    }
  })

  // 每间隔一分钟轮询是否存在拍卖结束的物品
  // 这里可能存在一个服务器时间和客户端时间不一致的情况，
  setInterval(function handleAuctionOver () {
    const date = Date.now()
    // 需要超时处理的所有物品
    const toDealDatas = Object.entries(wss.auctionItems).filter(([key, value]) => {
      return date > (+key)
    })
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        toDealDatas.forEach((datas) => {
          // datas 相同超时时间物品数组
          datas.forEach(data => {
            const {startTime, endTime, from, ...targetProp} = data
            // 买方
            if (client.name === from.payload.name) {
              client.send(JSON.stringify({
                source: 'system',
                type: 'AUCTION',
                data: {
                  message: '你成功的拍卖了该物品！',
                  item: data.item,
                  operation: 'success'
                },
                created_at: new Date().toLocaleDateString()
              }))
            }
            // 卖方
            if (client.name === data.auctionItem.holder.name) {
              client.send(JSON.stringify({
                source: 'system',
                type: 'AUCTION',
                data: {
                  message: '你成功的卖出了该物品！',
                  item: data.item,
                  operation: 'sold'
                },
                created_at: new Date().toLocaleDateString()
              }))
            }
            // 通知下架
            client.send(JSON.stringify({
              source: 'system',
              type: 'AUCTION',
              data: {
                message: '你成功的拍卖了该物品！',
                item: data.item,
                operation: 'timeout'
              },
              created_at: new Date().toLocaleDateString()
            }))
          })
        })
      }
    })
  }, 1000 * 30)
}
