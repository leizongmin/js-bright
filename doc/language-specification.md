语言规范
===============

## 关键字

__argument__
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

### 控制脚本

```
/* 程序开头部分 */
argument x, y, z                  // 定义参数（多个参数可使用空格来分隔），也可通过遍历$arguments变量来获取所有参数
var a, b, c                       // 定义变量（多个变量可使用空格来分隔）

/* 程序主体部分 */

// 定义延迟执行（在程序返回前执行，无论是否出错），可以为单行或多行
defer console.log('exit')         // 执行某个函数，不能是其他语句
defer {
  console.log('wahaha')
  console.log('exit')
}

// 赋值
let b = await x                   // 调用异步函数，返回结果保存到变量b中
let a, b, c = await x             // 多个返回值的异步函数（使用逗号分隔）
let a = Math.random()             // 调用普通的函数，获取返回值
let a = 12345 * 515               // 计算表达式，获取返回值


// 调用异步函数
await xxx                         // 调用函数xxx，无参数
await xxx(1, 2, 3)                // 带参数调用函数xxx
let a, b, c = xxx(1, 2, 3)        // 调用函数xxx，有多个返回值

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

// 插入javascript代码
i++
console.log(i)

// 返回值，可以有多个返回值（使用逗号分隔）
return
return x
return x, y
```

### 出错处理机制

异步函数格式：

```
function (arg1, arg2, callback) {
  // 最后一个参数为回调函数
  // 回调函数的第一个参数为出错信息，如果没有，则设置为null
  callback(null, retValue);
}
```

当调用异步函数出错时，整个程序将停止执行，这是可以通过注册的defer函数来处理：

```
// 在defer里面的程序中，可以通过变量error来获取返回的出错信息，如果为null，则表示没有出错
defer {
  if error {
    console.log(error)
  }
}
```
