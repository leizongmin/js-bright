/**
 * bright 编译器/语法分析
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var token = require('./token');

// 单词类型
var TOKEN = define.TOKEN;


var syntax = module.exports;


/**
 * 读取一行
 * 返回FALSE表示已经到底末尾
 *
 * @param {Array} tokenList
 * @return {Object}
 *   - {Array} line 当前行
 *   - {Array} next 剩下部分
 */
var readLine = function (tokenList) {
  if (tokenList[0]) {
    var lineNum = tokenList[0].line;
    for (var i = 1, len = tokenList.length; i < len; i++) {
      if (tokenList[i].line !== lineNum) {
        break;
      }
    }
    return {
      line:   tokenList.slice(0, i),
      next:   tokenList.slice(i)
    };
  } else {
    return false;
  }
};

/**
 * 抛出异常
 *
 * @param {Object} t
 * @param {String} e
 */
var throwError = function (t, e) {
  if (!e) {
    e = 'Unexpected token ' + t.text;
  }
  var err = new Error(e);
  err.error = e;
  err.token = t;
  console.error(err.stack);
  throw err;
};

/**
 * 添加一行代码
 * 如果最后一行是数组，则进入该数组，将代码添加到其末尾，一直嵌套下去
 *
 * @param {Object} context
 * @param {String} line
 */
var pushCodeLine = function (context, line) {
  // 生成缩进空格
  var spaces = getIndentSpace(context);
  context.code.push(spaces + line);
};

/**
 * 取缩进空格
 *
 * @param {Object} context
 */
var getIndentSpace = function (context) {
  var spaces = '';
  for (var i = 0; i < context.indent; i++) {
    spaces += '  ';
  }
  return spaces;
};

/**
 * 返回一个新的context
 *
 * @param {Object} context
 * @return {Object}
 */
var createNewContext = function (context) {
  var ret = {};
  for (var i in context) {
    ret[i] = context[i];
  }
  ret.defers = [];
  ret.code = [];
  return ret;
};

/**
 * 返回一个token对象
 *
 * @param {Integer} type
 * @param {Integer} line
 * @param {Integer} column
 * @param {String} text
 * @return {Object}
 */
var createNewToken = function (type, line, column, text) {
  return {type: type, line: line, column: column, text: text};
};

/**
 * 在末尾增加return语句
 *
 * @param {Array} tokenList
 * @param {Boolean} isNested
 * @return {Array}
 */
var addReturnTokenToEnd = function (tokenList, isNested) {
  var lastT = tokenList[tokenList.length - 1];
  var tReturn = createNewToken(TOKEN.KEYWORD, (lastT ? lastT.line + 1 : -1), 0, 'return');
  if (isNested) {
    tReturn.isNested = isNested;
  }
  tokenList.push(tReturn);
  return tokenList;
};

/**
 * 解析条件
 *
 * @param {Array} tokenList
 * @return {String}
 */
var parseCondition = function (tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  if (!(lastT.type === TOKEN.SYMBLE && lastT.text === '{')) {
    return throwError(lastT);
  }
  // 取出条件部分
  tokenList.pop();
  var cond = '';
  tokenList.forEach(function (t) {
    // 将等于号=转化成==
    if (t.type === TOKEN.SYMBLE && t.text === '=') {
      cond += ' == ';
    } else {
      cond += t.text;
    }
  });
  return '(' + cond + ')';
};

/**
 * 解析多个参数（赋值）
 * 用逗号分割
 * 比如：  a b[c] d.e f[g[0]]
 *          
 *
 * @param {Array} tokenList
 * @return {Object}
 *   - {Array} names 标识符数组
 *   - {Array} next 剩下的单词
 */
var parseMultiArgument = function (tokenList) {
  var names = [];
  var lastPos = 0;
  // 增加一个名称
  var push = function (i) {
    if (lastPos < i) {
      var text = '';
      var brackets = [];
      tokenList.slice(lastPos, i).forEach(function (t) {
        text += t.text;
        // 检查括号是否匹配
        if (t.type === TOKEN.SYMBLE) {
          if (t.text === '[' || t.text === '(') {
            brackets.push(t.text);
          } else if (t.text === ']' || t.text === ')') {
            var b = brackets.pop();
            if (!((t.text === ']' && b === '[') || (t.text === ')' && b === '('))) {
              return throwError(t, 'brackets do not match');
            }
          }
        }
      });
      if (brackets.length > 0) {
        return throwError(t, 'brackets do not match');
      }
      names.push(text);
      lastPos = i + 1;
    }
  };
  for (var i = 0, len = tokenList.length; i < len; i++) {
    var t = tokenList[i];
    if (t.type === TOKEN.SYMBLE) {
      if (t.text === ',') {
        push(i);
      } else if (t.text === '=') {
        push(i);
        break;
      }
    }
  }
  return {
    names:  names,
    next:   tokenList.slice(i + 1)
  };
};

/**
 * 生成多个参数代码
 *
 * @param {Array} names
 * @return {Object}
 *    - {Array} args
 *    - {Array} init
 */
var getMultiArgumentsCode = function (names) {
  var args = [];
  var init = [];
  names.forEach(function (n, i) {
    args.push('$$_arg_' + i);
    init.push(n + ' = $$_arg_' + i + ';');
  });
  return {args: args, init: init};
};

/**
 * 解析多个返回值
 * 用空格或者逗号分割
 *
 * @param {Array} tokenList
 * @return {Array}
 */
var parseMultiValue = function (tokenList) {
  var names = [];
  var lastPos = 0;
  // 增加一个名称
  var push = function (i) {
    if (lastPos < i) {
      var text = '';
      var brackets = [];
      tokenList.slice(lastPos, i).forEach(function (t) {
        text += t.text;
        // 检查括号是否匹配
        if (t.type === TOKEN.SYMBLE) {
          if (t.text === '[' || t.text === '(') {
            brackets.push(t.text);
          } else if (t.text === ']' || t.text === ')') {
            var b = brackets.pop();
            if (!((t.text === ']' && b === '[') || (t.text === ')' && b === '('))) {
              return throwError(t, 'brackets do not match');
            }
          }
        }
      });
      if (brackets.length > 0) {
        return throwError(t, 'brackets do not match');
      }
      names.push(text);
      lastPos = i + 1;
    }
  };
  for (var i = 0, len = tokenList.length; i < len; i++) {
    var t = tokenList[i];
    if (t.type === TOKEN.SYMBLE) {
      if (t.text === ',') {
        push(i);
      }
    }
  }
  push(i);
  return names;
};

/**
 * 全都空白单词
 *
 * @param {Array} tokenList
 * @return {Array}
 */
var removeBlankToken = function (tokenList) {
  var ret = [];
  tokenList.forEach(function (t) {
    if (t.type !== TOKEN.BLANK) {
      ret.push(t);
    }
  });
  return ret;
};

/**
 * 生成外围的js代码
 *
 * @param {Object} context
 * @return {String}
 */
syntax.wrap = function (context) {
  // 生成变量列表声明
  if (context.vars.length > 0) {
    var varsCode = '    var ' + context.vars.join(', ') + ';\n';
  } else {
    var varsCode = '';
  }

  // 生成延迟执行代码
  if (context.defers.length > 0) {
    var indent = '    ';
    var defersCode = ['\n' + indent + '/* defer function start */',
                      indent + 'var $$_defers = [];'];
    context.defers.forEach(function (fn) {
      defersCode.push(indent + '$$_defers.push(' + fn + ');');
    });
    defersCode.push(indent + 'var $$_oldCallback = $$_callback;');
    defersCode.push(indent + '$$_callback = $$_callback_global = function () {');
    defersCode.push(indent + '  var $$_args = arguments;');
    defersCode.push(indent + '  $$_runtime.runDefers($$_defers, $$_args[0], function (err) {');
    defersCode.push(indent + '    if (err) $$_runtime.error(err.stack);');
    defersCode.push(indent + '    $$_oldCallback.apply(null, $$_args);');
    defersCode.push(indent + '  });');
    defersCode.push(indent + '};');
    defersCode.push(indent + '/* defer function end */\n');
    defersCode = defersCode.join('\n') + '\n';
  } else {
    defersCode = '';
  }

  // 生成最终代码并返回
  var indent = getIndentSpace(context).substr(4);
  var code = '(function (' + context.args.join(', ') + ') {\n' +
    indent + '  "use strict";\n\n' +
    indent + '  /* function header start */\n' +
    indent + '  var $$_callback, $arguments;\n' +
    indent + '  if (arguments.length < 1 || typeof(arguments[arguments.length - 1]) !== "function") {\n' +
    indent + '    throw new Error("Need a callback parameter.");\n' +
    indent + '  } else {\n' +
    indent + '    $arguments = $$_runtime.parseArguments(arguments);\n' +
    indent + '    $$_callback = $arguments.callback;\n' +
    indent + '    $arguments = $arguments.arguments;\n' +
    indent + '  }\n' +
    indent + '  var $$_callback_global = $$_callback;\n' +
    indent + '  /* function header end */\n\n' +
    indent + '  try {\n' +
    (varsCode ? indent + varsCode : '') +
    (defersCode ? indent + defersCode : '') +
             context.code.join('\n') + '\n' +
    indent + '  } catch (err) {\n' +
    indent + '    return $$_callback_global(err);\n' +
    indent + '  }\n' +
    indent + '})';
    
  return code;
};

/**
 * 开始语法分析
 * 直接返回编译后的js代码
 *
 * @param {Array|Object} tokenList
 * @param {Boolean} isNested
 * @return {String}
 */
syntax.parse = function (tokenList, isNested) {
  if (isNested) {
    var context = tokenList;
  } else {
    var context = {   
      args:   [],     // 参数列表，全局
      vars:   [],     // 变量列表，全局
      defers: [],     // 延迟执行列表
      tokenList:  tokenList,  // 剩下的单词列表
      code:   [],     // 生成的js代码
      indent: 2       // 缩进
    };
  }

  // 自动在末尾增加return语句
  if (!isNested) {
    context.tokenList = addReturnTokenToEnd(context.tokenList);
  }

  // 添加行号标记
  var addLineNumber = function (t, msg) {
    pushCodeLine(context, '/* LINE:' + (t.line + 1) + ' ' + msg + ' */');
  };

  for (var ret; ret = readLine(context.tokenList);) {
    var line = removeBlankToken(ret.line);
    context.tokenList = ret.next

    // 跳过空行
    if (line.length < 1) {
      continue;
    }

    var firstT = line[0];
    var nextTs = line.slice(1);

    if (firstT.type === TOKEN.BLANK) {
      // 不处理空白字符
    } else if (firstT.type === TOKEN.KEYWORD) {
      var needNextToken = function () {
        if (nextTs.length < 1) {
          return throwError(firstT, 'Unexpected end of input');
        }
      };
      switch (firstT.text) {

        case 'argument':
          needNextToken();
          parseArgument(context, nextTs);
          break;

        case 'var':
          needNextToken();
          parseVar(context, nextTs);
          break;

        case 'let':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseLet(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'await':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseAwait(context, '', nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'sleep':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseSleep(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'function':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseFunction(context, '', nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'return':
          addLineNumber(firstT, 'START');
          parseReturn(context, nextTs, firstT.isNested);
          addLineNumber(firstT, 'END');
          break;

        case 'defer':
          needNextToken();
          parseDefer(context, nextTs);
          break;

        case 'if':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseIf(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'for':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseFor(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'break':
          addLineNumber(firstT, 'START');
          pushCodeLine(context, 'return $$_break(null);');
          addLineNumber(firstT, 'END');
          break;

        case 'continue':
          addLineNumber(firstT, 'START');
          pushCodeLine(context, 'return $$_continue(null);');
          addLineNumber(firstT, 'END');
          break;

        case 'throw':
          addLineNumber(firstT, 'START');
          parseThrow(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'javascript':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseJavascript(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        default:
          return throwError(firstT);
      }
    } else {
      addLineNumber(firstT, 'START');
      // 其他语句，直接返回原来的代码
      parseExpression(context, '', line);
      addLineNumber(firstT, 'END');
    }
  }

  // 返回最终的代码
  if (!isNested) {
    return syntax.wrap(context);
  }
};

/**
 * 取 { } 括号内的单词列表
 *
 * @param {Object} context
 * @return {Object}
 *  - {Array} body
 *  - {Array} next
 * @param {Boolean} isIf 是否为if语句
 */
var parseBraceBody = function (context, isIf) {
  var tokenList = context.tokenList;
  var ret;
  var body = [];
  var brace = 0;
  var containsElseElseIf = false;

  while (ret = readLine(tokenList)) {
    tokenList = ret.next;
    var line = ret.line;
    var _line = removeBlankToken(line);
    var firstT = _line[0];
    if (firstT) {
      var lastT = _line[_line.length - 1];
      if (isIf) {
        // if 语句中， } elseif { 情况，在 } 时结束
        if (firstT.type === TOKEN.SYMBLE && firstT.text === '}') {
          brace--;
        } else if (lastT.type === TOKEN.SYMBLE && lastT.text === '{') {
          brace++;
        }
      } else {
        // 非if语句中，} elseif { 情况影响花括号计数（特殊情况）
        var firstIsCloseBrace = false;
        var lastIsOpenBrace = false;
        if (firstT.type === TOKEN.SYMBLE && firstT.text === '}') {
          brace--;
          firstIsCloseBrace = true;
        }
        if (lastT.type === TOKEN.SYMBLE && lastT.text === '{') {
          brace++;
          lastIsOpenBrace = true;
        }
        if (!containsElseElseIf) {
          containsElseElseIf = firstIsCloseBrace && lastIsOpenBrace;
        }
      }
    }
    if (brace < 0) {
      // 如果末尾为这种情况：  } else {
      // 把 else { 接到剩余的单词前面
      if (_line.length > 1) {
        tokenList = _line.slice(1).concat(tokenList);
      }
      break;
    } else {
      // 保留原来可能包含空白字符的单词
      body = body.concat(line);
    }
  }

  // 特殊情况，如果是 { } 内包含了 if {} elseif {} 
  // 末尾会多了一个 }，需要去掉
  if (containsElseElseIf) {
    var lastT = body[body.length - 1];
    if (lastT && lastT.type === TOKEN.SYMBLE && lastT.text === '}') {
      body.pop();
    }
  }

  return {
    body:   body,
    next:   tokenList
  };
};

/**
 * 解析嵌套
 *
 * @param {Object} context
 * @param {Boolean} isReturn 是否在末尾增加return
 * @param {Boolean} isIf 是否为if语句
 */
var parseNested = function (context, isReturn, isIf) {
  var ret = parseBraceBody(context, isIf);
  if (isReturn) {
    ret.body = addReturnTokenToEnd(ret.body, true);
  }
  context.tokenList = ret.body;
  syntax.parse(context, true);
  context.tokenList = ret.next;
};

/**
 * 解析argument语句
 * 格式为： argument x,y,z 或者省略逗号： argument x y z
 * 输入的单词中，已经去掉了argument
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseArgument = function (context, tokenList) {
  var isComma = false;
  tokenList.forEach(function (t) {
    if (t.type === TOKEN.IDENTIFIER) {
      isComma = false;
      context.args.push(t.text);
    } else if (t.type === TOKEN.SYMBLE && t.text === ',' && !isComma) {
      isComma = true;
    } else {
      throwError(t);
    }
  });
};

/**
 * 解析var语句
 * 格式为： var x,y,z 
 * 可以同时初始化： var x=0, y=1, z=2
 * 输入的单词中，已经去掉了var
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseVar = function (context, tokenList) {
  var brackets = [];
  var isInit = false;
  var currName = null;
  var initTokens = [];
  var lastT = tokenList[tokenList.length - 1];
  tokenList.push(createNewToken(TOKEN.SYMBLE, lastT.line, lastT.column + lastT.text.length, ','));
  tokenList.forEach(function (t) {
    if (isInit) {
      if (t.type === TOKEN.SYMBLE) {
        if (t.text === '(' || t.text === '[') {
          initTokens.push(t);
          brackets.push(t);
        } else if (t.text === ')') {
          var t2 = brackets.pop();
          if (t2.text !== '(') {
            return throwError(t);
          }
          initTokens.push(t);
        } else if (t.text === ']') {
          var t2 = brackets.pop();
          if (t2.text !== '[') {
            return throwError(t);
          }
          initTokens.push(t);
        } else if (t.text === ',') {
          // 括号里面的逗号不算分隔多个变量
          if (brackets.length > 0) {
            initTokens.push(t);
          } else {
            // 初始化结束，添加初始化语句
            initTokens.push(createNewToken(TOKEN.SYMBLE, t.line, t.column, ';'));
            parseExpression(context, currName, initTokens);
            isInit = false;
          }
        } else {
          initTokens.push(t);
        }
      } else {
        initTokens.push(t);
      }
    } else {
      if (t.type === TOKEN.IDENTIFIER) {
        context.vars.push(t.text);
        currName = t.text;
        brackets = [];
        initTokens = [];
      } else if (currName && t.type === TOKEN.SYMBLE) {
        if (t.text === ',') {
          isInit = false;
        } else if (t.text === '=') {
          isInit = true;
        } else {
          return throwError(t);
        }
      } else {
        return throwError(t);
      }
    }
  });
};

/**
 * 解析let语句
 * 格式为： let name = xxx
 * 如果是await语句，支持多返回值，如 let a,b,c = await fn() 
 * 输入的单词中，已经去掉了let
 * 如果name没有在var中声明，则自动声明
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseLet = function (context, tokenList) {
  if (tokenList.length < 3) {
    return throwError(tokenList[tokenList.length - 1], 'Unexpected end of input');
  }
  
  // 分析变量名，直到遇到等于号才结束
  var ret = parseMultiArgument(tokenList);
  var names = ret.names;
  if (ret.next.length < 1) {
    return throwError(tokenList[tokenList.length - 1], 'Unexpected end of input');
  } else {
    tokenList = ret.next;
  }

  if (tokenList[0].type === TOKEN.KEYWORD) {
    if (tokenList[0].text === 'await') {
      if (!tokenList[1]) {
        return throwError(tokenList[0], 'Unexpected end of input')
      }
      parseAwait(context, names, tokenList.slice(1));
    } else if (tokenList[0].text === 'function') {
      if (!tokenList[1]) {
        return throwError(tokenList[0], 'Unexpected end of input')
      }
      if (names.length > 1) {
        return throwError(tokenList[0], 'Not support tuple assignment');
      }
      parseFunction(context, names[0], tokenList.slice(1));
    } else {
      return throwError(tokenList[0]);
    }
  } else {
    if (names.length > 1) {
      return throwError(tokenList[0], 'Not support tuple assignment');
    }
    parseExpression(context, names[0], tokenList);
  }
};

/**
 * 解析表达式语句
 * 如：  变量     a
 *       数值     123
 *       字符串  "haha"
 *       表达式  a + b
 *               (a + b)
 *       函数    sin(50)
 *               (sin(50) + sin(60))
 * 只能出现以下字符：
 *   标识符，数值，字符串，符号 . + - * / ( ) [ ] ! | & ^ >> <<
 *   标识符、数值、字符串中间必须有符号分割，不能存在两个连续的符号
 * 
 * @param {Object} context
 * @param {String} name 保存的变量名称，可以为空
 * @param {Array} tokenList
 */
var parseExpression = function (context, name, tokenList) {
  var code = '';
  var isName = false;
  tokenList.forEach(function (t) {
    if (t.type === TOKEN.IDENTIFIER || t.type === TOKEN.KEYWORD) {
      // 相邻的关键字或标识符必须用空格隔开
      code += (isName ? ' ' : '') + t.text;
      isName = true;
    } else {
      code += t.text;
      isName = false;
    }
  });
  code = (name ? name + ' = ' : '') + code.trim();
  pushCodeLine(context, code);
};

/**
 * 解析await语句
 * 格式为： await xxx  或者 await xxx() 或者带参数 await xxx(a, b)
 * 输入的单词中，已经去掉了await
 * 或者等待一段时间：  await 1000  （单位为毫秒）
 *
 * @param {Object} context
 * @param {Array} names
 * @param {Array} tokenList
 */
var parseAwait = function (context, names, tokenList) {
  var firstT = tokenList[0];
  if (tokenList.length === 1 && firstT.type === TOKEN.NUMBER) {
    return throwError(firstT);
  } else {
    // 调用函数
    if (tokenList[0].type !== TOKEN.IDENTIFIER) {
      return throwError(tokenList[0]);
    }
    var lastT = tokenList[tokenList.length - 1];
    if (lastT.type === TOKEN.SYMBLE && lastT.text === ')') {
      // 生成 xxx(a, b, 
      var call = '';
      tokenList.slice(0, tokenList.length - 1).forEach(function (t) {
        call += t.text;
      });
      // 如果是 xxx() 则不在后面加逗号
      var lastT2 = tokenList[tokenList.length - 2];
      if (!(lastT2 && lastT2.type === TOKEN.SYMBLE && lastT2.text === '(')) {
        call += ', ';
      }
    } else {
      // 生成 xxx(
      var call = '';
      tokenList.forEach(function (t) {
        call += t.text;
      });
      call += '(';
    }
  }
  // 生成 function (arg1, arg2, ...) {
  if (names.length > 0) {
    var code = getMultiArgumentsCode(names);
  }
  call += 'function (' + (names.length > 0 ? code.args.join(', ') : '') + ') {';
  pushCodeLine(context, call);
  context.indent++;
  if (names.length > 0) {
    code.init.forEach(function (line) {
      pushCodeLine(context, line);
    });
  }
  syntax.parse(context, true);
  context.indent--;
  pushCodeLine(context, '});');
};

/**
 * 解析return语句
 * 格式为： return x 或者多个返回值 return a,b,c
 *   返回值只能是数值或者标识符，不能有其他运算符
 * 输入的单词中，已经去掉了return
 *
 * @param {Object} context
 * @param {Array} tokenList
 * @param {Boolean} isNested
 */
var parseReturn = function (context, tokenList, isNested) {
  var values = ['null'];
  if (tokenList.length > 0) {
    values = values.concat(parseMultiValue(tokenList));
  }
  pushCodeLine(context, 'return $$_callback' + (isNested ? '' : '_global') + '(' + values.join(', ') + ');');
};

/**
 * 解析defer语句
 * 格式为： defer xxx() 或者省略圆括号 defer xxx
 *    如果是多行：defer {
 *                  xx()
 *                  yy()
 *                }
 * 输入的单词中，已经去掉了defer
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseDefer = function (context, tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  var codeTop = 'function (error, $$_callback) {\n';
  var codeBottom = '\n    }';
  if (lastT.type === TOKEN.SYMBLE) {
    if (lastT.text === ')' && tokenList.length >= 3) {
      // defer xxx() 情况
      var call = '';
      tokenList.forEach(function (t) {
        call += t.text;
      });
      call = '      ' + call + ';\n      return $$_callback(null);';
      context.defers.push(codeTop + call + codeBottom);
    } else if (lastT.text === '{' && tokenList.length === 1) {
      // defer {    情况
      var newContext = createNewContext(context);
      newContext.indent = 3;
      parseNested(newContext, true);
      var code = newContext.code.join('\n');
      context.defers.push(codeTop + code + codeBottom);
      context.tokenList = newContext.tokenList;
    } else {
      return throwError(lastT);
    }
  } else if (lastT.type === TOKEN.IDENTIFIER) {
    // defer xxx 情况
    var call = '';
    tokenList.forEach(function (t) {
      call += t.text;
    });
    call = '      ' + call + '();\n      return $$_callback(null);';
    context.defers.push(codeTop + call + codeBottom);
  } else {
    return throwError(lastT);
  }
};

/**
 * 解析if语句
 * 格式为： if a+b=c {
 *            ooxx()
 *          } 
 * 输入的单词中，已经去掉了if
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseIf = function (context, tokenList) {
  // runtime.ifCondition()的参数
  var conditions = [];
  
  // 解析执行主体部分
  // TODO: 应该增加 return $$_callback(null) 到末尾
  var parseBody = function () {
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext, true, true);
    context.tokenList = newContext.tokenList;
    var code = newContext.code.join('\n');
    code = 'function ($$_callback) {\n' +
           code + '\n' +
           getIndentSpace(context) + '}';
    return code;
  }

  // 取出当前行的条件部分
  // 如 if xx {  或者 elseif xx {
  conditions.push(parseCondition(tokenList));
  conditions.push(parseBody());

  // 如果下一行是 elseif 或 else ，则继续解析
  var nextT = context.tokenList[0];
  if (nextT && nextT.type === TOKEN.KEYWORD && 
     (nextT.text === 'else' || nextT.text === 'elseif')) {
    var hasElse = false;
    for (var ret; ret = readLine(context.tokenList);) {
      var line = ret.line;
      var _line = removeBlankToken(line);
      context.tokenList = ret.next
      var firstT = _line[0];
      var nextTs = _line.slice(1);

      if (firstT.type === TOKEN.KEYWORD) {
        if (firstT.text === 'elseif') {
          conditions.push(parseCondition(nextTs));
          conditions.push(parseBody());
        } else if (firstT.text === 'else') {
          // 只能出现一次else
          if (hasElse) {
            return throwError(firstT);
          }
          conditions.push(parseBody());
          hasElse = true;
        } else {
          context.tokenList = line.concat(context.tokenList);
          break;
        }
      } else {
        context.tokenList = line.concat(context.tokenList);
        break;
      }
    }
  }
 
  // 解析后面的代码
  var newContext = createNewContext(context);
  newContext.indent++;
  parseNested(newContext, true);
  context.tokenList = newContext.tokenList;
  var nextCode = newContext.code.join('\n');

  var code = '$$_runtime.ifCondition(' + conditions.join(', ') + ', function () {\n' +
             nextCode + '\n' +
             getIndentSpace(context) + '});';
  pushCodeLine(context, code);
};

/**
 * 解析for语句
 * 格式为： for a+b=c {
 *            ooxx()
 *          } 
 * 无限循环：  for {
 *               ooxx()
 *             }
 * 遍历：   for i in obj {
 *            ooxx()
 *          }
 * 输入的单词中，已经去掉了for
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseFor = function (context, tokenList) {
  // 解析后面的代码
  var parseNext = function () {
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext);
    context.tokenList = newContext.tokenList;
    var nextCode = newContext.code.join('\n');
    return nextCode;
  }

  if (tokenList.length >= 3 && tokenList[1].type === TOKEN.KEYWORD && tokenList[1].text === 'in') {
    // 遍历
    if (tokenList[0].type !== TOKEN.IDENTIFIER) {
      return throwError(tokenList[0]);
    }
    var keyName = tokenList[0].text;
    var objName = '';
    tokenList.slice(2, tokenList.length - 1).forEach(function (t) {
      objName += t.text;
    });
    // 解析循环体
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext, true);
    context.tokenList = newContext.tokenList;
    var bodyCode = newContext.code.join('\n');
    var indent = getIndentSpace(context);
    var code = '$$_runtime.forEachLoop(' + objName + ', function (' + keyName + ', $$_continue, $$_break) {\n' +
                indent + '  var $$_callback = $$_continue;\n' +
                bodyCode + '\n' +
                indent + '}, function () {\n' +
                parseNext() + '\n' +
                indent + '});';
    pushCodeLine(context, code);
  } else {
    if (tokenList.length === 1 && tokenList[0].type === TOKEN.SYMBLE && tokenList[0].text === '{') {
      // 无条件循环
      var condition = 'true';
    } else {
      // 条件循环
      var condition = parseCondition(tokenList);
    }
    // 解析循环体
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext, true);
    context.tokenList = newContext.tokenList;
    var bodyCode = newContext.code.join('\n');
    var indent = getIndentSpace(context);
    var code = '$$_runtime.conditionLoop(function () {\n' +
                indent + '  return ' + condition + ';\n' +
                indent + '}, function ($$_continue, $$_break) {\n' +
                indent + '  var $$_callback = $$_continue;\n' +
                bodyCode + '\n' +
                indent + '}, function () {\n' +
                parseNext() + '\n' +
                indent + '});';
    pushCodeLine(context, code);
  }
};

/**
 * 解析throw语句
 * 格式为： throw 或者 throw new Error('Error')
 * 输入的单词中，已经去掉了throw
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseThrow = function (context, tokenList) {
  if (tokenList.length < 1) {
    pushCodeLine(context, 'return $$_callback_global(new Error());');
  } else {
    parseExpression(context, 'var $$_err', tokenList);
    pushCodeLine(context, 'return $$_callback_global($$_err);');
  }
};

/**
 * 解析function语句
 * 格式为： function (arg1, arg2) {
 * 或者无参数  function {
 * 输入的单词中，已经去掉了function
 *
 * @param {Object} context
 * @param {String} name 保存的变量名称，可以为空
 * @param {Array} tokenList
 */
var parseFunction = function (context, name, tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  if (!(lastT.type === TOKEN.SYMBLE && lastT.text === '{')) {
    return throwError(lastT);
  }

  // 解析参数
  var argNames = [];
  if (tokenList.length === 1) {
    // 无参数
  } else {
    var argTokens = tokenList.slice(0, tokenList.length - 1);
    var firstT = argTokens[0];
    var lastT = argTokens[argTokens.length - 1];
    if (!(firstT.type === TOKEN.SYMBLE && firstT.text === '(')) {
      return throwError(firstT);
    }
    if (!(lastT.type === TOKEN.SYMBLE && lastT.text === ')')) {
      return throwError(firstT);
    }
    var isComma = true;
    argTokens.slice(1, argTokens.length - 1).forEach(function (t) {
      if (isComma && t.type === TOKEN.IDENTIFIER) {
        argNames.push(t.text);
        isComma = false;
      } else if (!isComma && t.type === TOKEN.SYMBLE && t.text === ',') {
        isComma = true;
      } else {
        return throwError(t);
      }
    });
  }

  // 解析函数体
  var newContext = createNewContext(context);
  newContext.vars = [];
  newContext.indent += 2;
  parseNested(newContext, true);
  
  // 封装函数
  newContext.args = argNames;
  newContext.args.push('$$_callback');
  var body = syntax.wrap(newContext);
  pushCodeLine(context, '');
  var code = (name ? name + ' = ' : '') + body + ';';
  pushCodeLine(context, code);
  pushCodeLine(context, '');
  context.tokenList = newContext.tokenList;  
};

/**
 * 解析sleep语句
 * 格式为： sleep 1000  或者 sleep x*y
 * 输入的单词中，已经去掉了sleep
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseSleep = function (context, tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  tokenList.push(createNewToken(TOKEN.SYMBLE, lastT.line, lastT.column + lastT.text.length + 1, ';'));
  parseExpression(context, 'var $$_sleep_ms', tokenList);
  var code = '$$_runtime.sleep($$_sleep_ms, function ($$_err) {';
  pushCodeLine(context, code);
  context.indent++;
  syntax.parse(context, true);
  context.indent--;
  pushCodeLine(context, '});');
};

/**
 * 解析javascript语句
 * 格式为： javascript {
 * 输入的单词中，已经去掉了javascript
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseJavascript = function (context, tokenList) {
  var firstT = tokenList[0];
  if (!(tokenList.length === 1 && firstT.type === TOKEN.SYMBLE && firstT.text === '{')) {
    return throwError(firstT);
  }
  var ret = parseBraceBody(context);
  var tokenList = ret.body;
  var line;
  while (line = readLine(tokenList)) {
    tokenList = line.next;
    var isName = false;
    var code = '';
    line.line.forEach(function (t) {
      if (t.type === TOKEN.IDENTIFIER || t.type === TOKEN.KEYWORD) {
        // 相邻的关键字或标识符必须用空格隔开
        code += (isName ? ' ' : '') + t.text;
        isName = true;
      } else {
        code += t.text;
        isName = false;
      }
    });
    pushCodeLine(context, code);
  }

  context.tokenList = ret.next;
};
