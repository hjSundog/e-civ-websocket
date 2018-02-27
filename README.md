e-civ 电子文明 RESTful API
=============================

这是个基于Koa2的轻量级RESTful API Server，支持ES6。

**注意：因升级Koa版本至2.3.0，为配合相应的依赖项，故需要Node.js版本大于等于v8.0.0，NPM大于等于v5.0.0。**

约定使用JSON格式传输数据，POST、PUT、DELET方法支持的Content-Type为`application/x-www-form-urlencoded、multipart/form-data、application/json`可配置支持跨域。非上传文件推荐application/x-www-form-urlencoded。通常情况下返回application/json格式的JSON数据。

**项目使用Mongodb，请先确保你安装好了相关环境。**


开发使用说明
------------

```Shell
// 开启mongodb后

npm run start
```

Websocket消息结构
```JSON
{
  "uuid": "uasd-qwor", // 唯一标识，可能会有用
  "source": "system", // 来源，各个channel或者'system'
  "type": "letter", // 消息类型
  "data": { // 消息数据

  },
  "created_at": "2018-02-11T15:02:21.760Z" // 消息创建时间
}

// 交易数据结构
// 客户端
{
  "uuid": "uasd-qwor", // 唯一标识，可能会有用
  "source": "person", // 请求来源对象信息
  "type": "INVITATION", // 消息类型
  "data": { // 消息数据
    "from": "auth.user.name",
    "to": "",
    "payload": {}, // 考虑不周，这里放用户信息
    "items": [
      // "item": "",
      // "count": "",
    ],  // 交易物品
    "extra": [],  // 额外的物品，比如补偿金币
    "message": "留言",
    "operation": "trade/trading/invite/close/refuse/receive/cancle",
  },
  "created_at": "2018-02-11T15:02:21.760Z" // 消息创建时间  
}


// 数据结构变化
// forEach 的优化
// 
// 全局拍卖
// 地图

```
