语言规范
===============

## 关键字

__argument__
__require__
__var__
__let__
__if__
__else__
__elseif__
__for__
__in__
__break__
__continue__
__return__
__await__
__defer__
__true__
__false__
__null__
__undefined__
__NaN__


## 范例

控制脚本：

```

/* 程序开头部分 */
argument x, y, z                  // 定义参数，也可以通过变量arguments变量来获取
let express = require "express"   // 载入模块
var a, b, c                       // 定义变量

/* 程序主体部分 */

// 定义延迟执行（在程序返回前执行，无论是否出错），可以为单行或多行
defer console.log('exit') // 执行某个函数，不能是其他语句
defer {
  console.log('wahaha')
  console.log('exit')
}

// 条件判断
if x + y = z {
  console.log('x + y = z')
} elseif x + y < z {
  console.log('x + y < z')
} else {
  console.log('x + y > z')
}

// 循环
for a > 0 {
  a++
  if a > 10 {
    continue      // 提前结束当次循环
  }
  if a > 20 {
    break         // 跳出循环
  }
}

// 无限循环
for {
  console.log('wahaha')
}

// 遍历
for i in x {
  console.log(x[i])
}

// 等待异步执行
await yy()
let b = zz(a, b)

// 返回值，可以有多个返回值
return
return x
return x, y

```

在Node.js中使用：

```
Script.compile('filename')                // 编译代码
      .call(x, y, z)                      // 设置调用参数
      .start(function (err, a, b, c) {    // 开始执行
        if (err) throw err;
        // ...
      });
```