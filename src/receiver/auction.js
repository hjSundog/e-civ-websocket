function adaptor(data) {
    const {payload, auctionItem, message} = data;
    // 先使用startTime@name 的形式作为id
    return {
        id: auctionItem.startTime+'@'+payload.name,
        item: {
            ...auctionItem.item
        },
        count: auctionItem.count,
        startTime: auctionItem.startTime,
        endTime: auctionItem.endTime,
        from: {
            payload: {
                ...payload
            },
            price: auctionItem.price
        }
    }
}

function selectAuctionItem(AuctionItems, endTime, id) {
    return AuctionItems[endTime].find((item) => {
        return item.id === id;
    })
}

function updateAuctionItem(AuctionItems, endTime, id, update) {
    const data = selectAuctionItem(AuctionItems, endTime, id)[0];
    console.log('pre price: ' + data)
    data.from.price = update;
    console.log('after price: '+ data)

}

module.exports = function (ws, wss, WebSocket) {
    ws.on('message', function(message) {
        const tMessage = JSON.parse(message.data);
        const fromData = tMessage.data.auctionItem;
        const user = tMessage.data.payload;
        const id = fromData.startTime+'@'+user.name;
        if (!tMessage.type) {
          console.log('init type: ' + tMessage)
          return
        }
        if (tMessage.type === 'AUCTION') {
            switch(tMessage.data.operation){
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
                                    ...tData
                                },
                                created_at: new Date().toLocaleDateString()
                            }))
                        }
                    })
                    break
                }
                case 'makingBid': {
                    if (wss.auctionItems[fromData.endTime]) {
                        // 更改
                        updateAuctionItem(wss.auctionItems, fromData.endTime, id, fromData.price)
                        // 广播
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(selectAuctionItem(wss.auctionItems, fromData.endTime, id)))
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
                    break;
                }
            default:
                return
            }

        }
    })

    // 每间隔一秒轮询是否存在拍卖结束的物品
    // 这里可能存在一个服务器时间和客户端时间不一致的情况，
    setInterval(function handleAuctionOver() {
        wss.auctionItems[Date.now()]?wss.auctionItems[Date.now()].forEach((item) => {
        // 查找指定websocket 发送数据
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
            // 买方通知
            if (client.name === item.from.payload.name) {
                const {startTime, endTime, from, ...targetProp} = item
                // 这里做数据库的操作，现在先搁置
                // code here
                client.send(JSON.stringify({
                    source: 'system',
                    type: 'AUCTION',
                    data: {
                        auctionItem: {
                            item: item.item,
                            count: item.count,
                        },
                        operation: 'sold',
                    },
                    created_at: new Date().toLocaleDateString()
                }))
                return
            }
            // 卖方通知
            if (client.name === item.item.name) {
                client.send(JSON.stringify({
                    source: 'system',
                    type: 'AUCTION',
                    data: {
                        auctionItem: {
                            price: item.from.price
                        },
                        operation: 'sold',
                    },
                    created_at: new Date().toLocaleDateString()
                }))
                return
            }
            }
        })
        }):null
    }, 1000);
}

