Tea.js
==========

简单的脚本语言，编译成JavaScript来运行

安装

```bash
npm install tea
```

新建文件：test.tea

```
argument n
var i
let i = 0
for i < n {
  await 1000
  console.log(i)
  i++
}
return i
```

运行

```bash
node
require('tea')
test = require('./test')
test(1000, console.log)
```
