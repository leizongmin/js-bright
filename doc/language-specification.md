语言规范
===============

## 关键字

__await__
__argument__
__break__
__continue__
__defer__
__else__
__elseif__
__false__
__for__
__function__
__if__
__in__
__javascript__
__let__
__NaN__
__null__
__return__
__throw__
__true__
__undefined__
__var__


## 范例

### 声明变量 var

所有变量在使用前必须先声明，否则会抛出异常。

```
var a, b, c
var a = 1, b = Math.random(), c
```

### 等待异步函数返回  await

当调用的函数不需要参数时，可以省略后面的括号

```
// 没有返回值的函数调用
await async_func
await async_func()
await async_func(1, 2, 3)

// 有返回值的函数调用
let err, data = async_func()
``

### 条件判断 if elseif else

```
// 只要if
if true {
  console.log('true')
}

// if ... else
if false {
  console.log('------')
} else {
  console.log('good')
}

// 一个或多个elseif
if 1 + 1 == 2 {
  console.log('1 + 1 = 2')
} elseif 2 + 2 = 2 {
  console.log('wrong')
} elseif 4 + 4 = 7 {
  console.log('wrong')
} else {
  console.log('else')
}
```

### 循环 for

在循环体内，通过__break__来跳出循环，__continue__来提前结束本次循环

```
// 条件循环
var i = 0
for i < 10 {
  console.log(i)
  i++
}

// 无条件循环
var i = 0
for {
  i++
  if i > 100 {
    break
  }
}

// 遍历数组或对象
for i in arr {
  console.log(arr[i])
}
```

### 定义函数 function

在函数内通过__return__来返回，__return__语句可以返回多个值

```
// 定义函数
let fn1 = function () {
  return 1, 2, 3
}
let fn2 = function (a, b) {
  return a + b
}

// 调用函数
let err, a, b, c = fn1()
let err, d = fn2(3, 4)
```

### 推迟执行 defer

通过__defer__定义的语句可以推迟到函数返回时执行。

```
// 定义单行语句
defer console.log('return')

// 定义多行语句
defer {
  console.log('ahah')
  console.log('fdfd')
}

// defer定义的语句可以通过判断error变量来检查程序返回时是否有错误
defer {
  if error {
    console.log('Error: ' + error)
  }
}
```

### 程序暂停 sleep

__sleep__可以使当前函数暂停一段时间，但不会阻塞当前进程的执行。

```
// 暂停1000毫秒
sleep 1000

// sleep后面可以是表达式
sleep a + b
```

### 内嵌javascript代码 javascript

```
javascript {
  var a = abc || cde || a;
  var b = function () {
    return arguemnts;
  }
}
```

### 返回值 return throw

__return__语句可以返回多个值。如果程序执行时出错，可以通过__throw__语句来返回出错信息

```
if ok {
  return a, b, c
} else {
  throw "not ok"
}
```

