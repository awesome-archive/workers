# Workers

Cloudflare Worker 上的代理脚本们

## More info -> [core](https://github.com/JAVClub/core)

## gd.js

本脚本需构建后使用, 请确保 webpack 及 webpack-cli 已安装

用于提供 Google Drive 中文件

```bash
npm i
cp gd-config.example.js gd-config.js
```

在 `gd-config.js` 中填写好配置后运行构建命令 `webpack gd.js` 即可

构建完成后将 `dist/main.js` 的内容部署在 Worker 上即可

使用方法: `GET https://xxx.xxx.workers.dev/{encryptedStr}`

其中 `{encryptedStr}` 为文件标识符及 Drive ID, 使用以下方法拼接并加密

```js
const cryptoJs = require('crypto-js')
const base64 = require('js-base64').Base64

const driveId = ''
const fileId = ''
const secret = ''

const uri = cryptoJs.AES.encrypt(driveId + '||!||' + fileId, secret).toString()
```

## img.js

用于代理提供的图片链接

直接将 `img.js` 中的内容部署在 Worker 上即可

使用方法: `GET https://xxx.xxx.workers.dev/https://path.to.your/image.png`
