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
