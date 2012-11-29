[![Build Status](https://secure.travis-ci.org/leizongmin/js-bright.png?branch=master)](http://travis-ci.org/leizongmin/js-bright)

Bright.js
==========

一种更优雅的JavaScript异步流程控制方式。

动画排序演示：http://bright.ucdok.com/simple/sort.html


## 安装

### 安装Bright.js命令行工具

```bash
npm install -g bright
```

### 安装Bright.js模块

```bash
npm install bright
```

## 在命令行下使用

新建文件 __test.bright__

```
var i = 10
for i >= 0 {
  console.log(i)
  sleep 500
  i--
}
console.log('end')
```

在命令行下执行以下命令

```bash
bright test.bright
```

## 在Node.js程序中使用

新建文件 __test_module.bright__

```
// 模块输出test函数，该函数接收一个参数
let exports.test = function (a) {
  sleep a
  return a
}
```

新建文件 test.js

```javascript
// 先载入bright模块，以使用bright的JIT编译器
var bright = require('bright');
// 载入刚才的bright程序
var test_module = require('./test_module');

test_module.test(1000, function (err, ret) {
  // 所有bright里面的函数的最后一个参数为回调函数
  // 回调函数的第一个参数是出错信息，可以在程序中通过throw来返回
  // 第二个参数起为通过return返回的多个值
  if (err) console.log(err && err.stack);
  console.log(ret);
});
```

## 在浏览器中使用

### 1、浏览器环境的JIT编译器

先在HTML页面中加载文件 __build/bright.js__ ，然后在`<script type="text/bright"></script>`标签内输入bright代码即可。

```
<script type="text/bright">
var i = 10
for i >= 0 {
  console.log(i)
  sleep 500
  i--
}
console.log('end')
</script>
```

参考文件 __build/test/test_jit.html__

### 2、预编译Bright.js代码，再在浏览器中运行

新建文件 __test.bright__

```
var i = 10
for i >= 0 {
  console.log(i)
  sleep 500
  i--
}
console.log('end')
```

使用Bright.js命令行工具来编译程序

```bash
bright -i test.bright -o test.js
```

先在HTML页面中加载Bright的运行时库 __build/bright.runtime.js__，然后再载入刚才编译的文件__test.js__即可运行。

参考文件 __build/test/test_runtime.html__

__Bright.js__命令行工具详细使用说明：`bright --help`



## 语言规范

详见这里：https://github.com/leizongmin/js-bright/blob/master/doc/language-specification.md


授权协议
================

```
Copyright (c) 2012 Lei Zongmin(雷宗民) <leizongmin@gmail.com>
http://ucdok.com

The MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
