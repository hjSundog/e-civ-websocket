// for test
// TODO: 动态更新stations, 可以通过wss.clients或者其他手段更新监听。
const stations = [
  {
    id: 'aisantang',
    name: '矮山塘广播站',
    level: '',
    group_id: '',
    owner_id: '',
    type: 'radioStation',
    position: {
      lat: 40.3,
      lng: 120.2
    }
  }, {
    id: 'balijie',
    name: '八里街广播站',
    level: '',
    group_id: '',
    owner_id: '',
    type: 'radioStation',
    position: {
      lat: 40.3,
      lng: 120.2
    }
  }
]

let usersWsByStation = {}

const chatChannelsReceiver = function (ws) {
  // TODO: 考虑从ws中获取其加入的广播站
  for (let station of stations) {
    usersWsByStation[station] = []
    ws.of(`chat-${station.id}`).on('login', (msg) => {
      usersWsByStation.push(ws)
      for (let userWs of usersWsByStation[station]) {
        userWs.of(`chat-${station.id}`).emit('message', {
          sender: {
            type: 'system'
          },
          receiver: {
            type: 'station',
            id: station.id
          },
          date: new Date(),
          message: {
            content: `欢迎 ${ws} 加入 ${station.name}`
          }
        })
      }
    })
    ws.of(`chat-${station.id}`).on('message', (msg) => {
      for (let userWs of usersWsByStation[station]) {
        userWs.of(`chat-${station.id}`).emit('message', {
          sender: {
            type: 'user',
            id: '',
            name: ''
          },
          receiver: {
            type: 'station',
            id: station.id
          },
          date: new Date(),
          message: {
            content: `${msg.content}`
          }
        })
      }
    })
    // TODO: 离开广播站或者掉线时垃圾回收。
  }
}

module.exports = chatChannelsReceiver
