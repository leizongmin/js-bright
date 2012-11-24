/**
 * Tea.js 编译器/语法分析
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
syntax.readLine = function (tokenList) {
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
syntax.throwWordError = function (t, e) {
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
syntax.codePushLine = function (context, line) {
  // 生成缩进空格
  var spaces = syntax.getIndentSpace(context);
  context.code.push(spaces + line);
};

/**
 * 取缩进空格
 *
 * @param {Object} context
 * @param {String} spaces
 */
syntax.getIndentSpace = function (context, spaces) {
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
syntax.newContext = function (context) {
  var ret = {};
  for (var i in context) {
    ret[i] = context[i];
  }
  ret.defers = [];
  ret.code = [];
  return ret;
};

/**
 * 在末尾增加return语句
 *
 * @param {Array} tokenList
 * @param {Boolean} isNested
 * @return {Array}
 */
syntax.addReturnAtEnd = function (tokenList, isNested) {
  var lastT = tokenList[tokenList.length - 1];
  if (lastT) {
    var tReturn = {
      type:   TOKEN.KEYWORD,
      line:   lastT.line + 1,
      column: 0,
      text:   'return'
    };
    if (isNested) {
      tReturn.isNested = isNested;
    }
    tokenList.push(tReturn);
  }
  return tokenList;
};

/**
 * 解析条件
 *
 * @param {Array} tokenList
 * @return {String}
 */
syntax.parseCondition = function (tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  if (!(lastT.type === TOKEN.SYMBLE && lastT.text === '{')) {
    return syntax.throwWordError(lastT);
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
syntax.parseMultiArgument = function (tokenList) {
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
              return syntax.throwWordError(t, 'brackets do not match');
            }
          }
        }
      });
      if (brackets.length > 0) {
        return syntax.throwWordError(t, 'brackets do not match');
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
syntax.getMultiArgumentsCode = function (names) {
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
syntax.parseMultiValue = function (tokenList) {
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
              return syntax.throwWordError(t, 'brackets do not match');
            }
          }
        }
      });
      if (brackets.length > 0) {
        return syntax.throwWordError(t, 'brackets do not match');
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
syntax.noBlankToken = function (tokenList) {
  var ret = [];
  tokenList.forEach(function (t) {
    if (t.type !== TOKEN.BLANK) {
      ret.push(t);
    }
  });
  return ret;
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
      indent: 2,      // 缩进
    };
  }

  // 自动在末尾增加return语句
  if (!isNested) {
    context.tokenList = syntax.addReturnAtEnd(context.tokenList);
  }

  for (var ret; ret = syntax.readLine(context.tokenList);) {
    var line = ret.line;
    context.tokenList = ret.next
    var firstT = line[0];
    var nextTs = line.slice(1);
    if (firstT.type === TOKEN.BLANK) {
      // 不处理空白字符
    } else if (firstT.type === TOKEN.KEYWORD) {
      var needNextToken = function () {
        if (nextTs.length < 1) {
          return syntax.throwWordError(firstT, 'Unexpected end of input');
        }
      };
      nextTs = syntax.noBlankToken(nextTs);
      switch (firstT.text) {

        case 'argument':
          needNextToken();
          syntax.parseArgument(context, nextTs);
          break;

        case 'var':
          needNextToken();
          syntax.parseVar(context, nextTs);
          break;

        case 'let':
          needNextToken();
          syntax.parseLet(context, nextTs);
          break;

        case 'require':
          needNextToken();
          syntax.parseRequire(context, '', nextTs);
          break;

        case 'await':
          needNextToken();
          syntax.parseAwait(context, '', nextTs);
          break;

        case 'return':
          syntax.parseReturn(context, nextTs, firstT.isNested);
          break;

        case 'defer':
          needNextToken();
          syntax.parseDefer(context, nextTs);
          break;

        case 'if':
          needNextToken();
          syntax.parseIf(context, nextTs);
          break;

        case 'for':
          needNextToken();
          syntax.parseFor(context, nextTs);
          break;

        case 'break':
          syntax.codePushLine(context, 'return $$_break(null);');
          break;

        case 'continue':
          syntax.codePushLine(context, 'return $$_continue(null);');
          break;

        default:
          return syntax.throwWordError(firstT);
      }
    } else {
      // 其他语句，直接返回原来的代码
      syntax.parseExpression(context, '', line);
    }
  }


  // 返回最终的代码
  if (!isNested) {
    // 生成变量列表声明
    if (context.vars.length > 0) {
      var varsCode = '    var ' + context.vars.join(', ') + ';\n';
    } else {
      var varsCode = '';
    }

    // 生成延迟执行代码
    if (context.defers.length > 0) {
      var indent = '    ';
      var defersCode = [indent + 'var $$_defers = [];'];
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
      defersCode = defersCode.join('\n') + '\n';
    } else {
      defersCode = '';
    }

    // 生成最终代码并返回
    context.args.push('$$_callback')
    var code = '(function (' + context.args.join(', ') + ') {\n' +
               '  "use strict";\n' +
               '  if (arguments.length !== ' + context.args.length + ') {\n' +
               '    var $$_callback = arguments[arguments.length - 1];\n' +
               '    var $$_err = new Error("Not enough arguments");\n' +
               '    if (typeof($$_callback) === "function") {\n' +
               '      return $$_callback($$_err);\n' +
               '    } else {\n' +
               '      throw $$_err;\n' +
               '    }\n' +
               '  }\n' +
               '  var $$_callback_global = $$_callback;\n' +
               '  try {\n' +
               varsCode +
               defersCode +
               context.code.join('\n') + '\n' +
               '  } catch (err) {\n' +
               '    return $$_callback_global(err);\n' +
               '  }\n' +
               '})';

    //console.log(context);
    return code;
  }
};

/**
 * 解析嵌套
 *
 * @param {Object} context
 * @param {Boolean} isReturn 是否在末尾增加return
 */
syntax.parseNested = function (context, isReturn) {
  var tokenList = context.tokenList;
  var ret;
  var body = [];
  var brace = 0;
  while (ret = syntax.readLine(tokenList)) {
    tokenList = ret.next;
    var line = syntax.noBlankToken(ret.line);
    var firstT = line[0];
    var lastT = line[line.length - 1];
    if (firstT.type === TOKEN.SYMBLE && firstT.text === '}') {
      brace--;
    } else if (lastT.type === TOKEN.SYMBLE && lastT.text === '{') {
      brace++;
    }
    if (brace < 0) {
      // 如果末尾为这种情况：  } else {
      // 把 else { 接到剩余的单词前面
      if (line.length > 1) {
        tokenList = line.slice(1).concat(tokenList);
      }
      break;
    } else {
      body = body.concat(line);  
    }
  }
  if (isReturn) {
    body = syntax.addReturnAtEnd(body, true);
  }
  context.tokenList = body;
  syntax.parse(context, true);
  context.tokenList = tokenList;
};

/**
 * 解析argument语句
 * 格式为： argument x,y,z 或者省略逗号： argument x y z
 * 输入的单词中，已经去掉了argument
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
syntax.parseArgument = function (context, tokenList) {
  var isComma = false;
  tokenList.forEach(function (t) {
    if (t.type === TOKEN.IDENTIFIER) {
      isComma = false;
      context.args.push(t.text);
    } else if (t.type === TOKEN.SYMBLE && t.text === ',' && !isComma) {
      isComma = true;
    } else {
      syntax.throwWordError(t);
    }
  });
};

/**
 * 解析var语句
 * 格式为： var x,y,z 或者省略逗号： var x y z
 * 输入的单词中，已经去掉了var
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
syntax.parseVar = function (context, tokenList) {
  var isComma = false;
  tokenList.forEach(function (t) {
    if (t.type === TOKEN.IDENTIFIER) {
      isComma = false;
      context.vars.push(t.text);
    } else if (t.type === TOKEN.SYMBLE && t.text === ',' && !isComma) {
      isComma = true;
    } else {
      syntax.throwWordError(t);
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
syntax.parseLet = function (context, tokenList) {
  if (tokenList.length < 3) {
    return syntax.throwWordError(tokenList[tokenList.length - 1], 'Unexpected end of input');
  }
  
  // 分析变量名，直到遇到等于号才结束
  var ret = syntax.parseMultiArgument(tokenList);
  var names = ret.names;
  if (ret.next.length < 1) {
    return syntax.throwWordError(tokenList[tokenList.length - 1], 'Unexpected end of input');
  } else {
    tokenList = ret.next;
  }

  if (tokenList[0].type === TOKEN.KEYWORD) {
    if (tokenList[0].text === 'await') {
      if (!tokenList[1]) {
        return syntax.throwWordError(tokenList[0], 'Unexpected end of input')
      }
      syntax.parseAwait(context, names, tokenList.slice(1));
    } else if (tokenList[0].text === 'require') {
      if (names.length > 1) {
        return syntax.throwWordError(tokenList[0], 'Not support tuple assignment');
      }
      if (!tokenList[1]) {
        return syntax.throwWordError(tokenList[0], 'Unexpected end of input')
      }
      syntax.parseRequire(context, names, tokenList.slice(1));
    } else {
      return syntax.throwWordError(tokenList[0]);
    }
  } else {
    if (names.length > 1) {
      return syntax.throwWordError(tokenList[0], 'Not support tuple assignment');
    }
    syntax.parseExpression(context, names[0], tokenList.slice(0));
  }
};

/**
 * 解析require语句
 * 格式为： require "abc" 或者使用变量 require x
 * 输入的单词中，已经去掉了require
 *
 * @param {Object} context
 * @param {Array} names 保存的变量名称
 * @param {Array} tokenList
 */
syntax.parseRequire = function (context, names, tokenList) {
  if (tokenList.length !== 1) {
    return syntax.throwWordError(tokenList[0]);
  }
  if (!(tokenList[0].type === TOKEN.IDENTIFIER || tokenList[0].type === TOKEN.STRING)) {
    return syntax.throwWordError(tokenList[0]);
  }
  var code = (names.length > 0 ? names[0] + ' = ' : '') + 'require(' + tokenList[0].text + ');';
  syntax.codePushLine(context, code);
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
syntax.parseExpression = function (context, name, tokenList) {
  var code = '';
  tokenList.forEach(function (t) {
    code += t.text;
  });
  code = (name ? name + ' = ' : '') + code.trim() + ';';
  syntax.codePushLine(context, code);
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
syntax.parseAwait = function (context, names, tokenList) {
  var firstT = tokenList[0];
  if (tokenList.length === 1 && firstT.type === TOKEN.NUMBER) {
    // 等待N毫秒
    var call = '$$_runtime.sleep(' + firstT.text + ', ';
  } else {
    // 调用函数
    if (tokenList[0].type !== TOKEN.IDENTIFIER) {
      return syntax.throwWordError(tokenList[0]);
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
  // 生成 function ($$_err, name) {
  if (names.length > 0) {
    var code = syntax.getMultiArgumentsCode(names);
  }
  call += 'function ($$_err' + (names.length > 0 ? ', ' + code.args.join(', ') : '') + ') {';
  syntax.codePushLine(context, call);
  context.indent++;
  syntax.codePushLine(context, 'if ($$_err) throw $$_err;');
  if (names.length > 0) {
    code.init.forEach(function (line) {
      syntax.codePushLine(context, line);
    });
  }
  syntax.parse(context, true);
  context.indent--;
  syntax.codePushLine(context, '});');
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
syntax.parseReturn = function (context, tokenList, isNested) {
  var values = ['null'];
  if (tokenList.length > 0) {
    values = values.concat(syntax.parseMultiValue(tokenList));
  }
  syntax.codePushLine(context, 'return $$_callback' + (isNested ? '' : '_global') + '(' + values.join(', ') + ');');
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
syntax.parseDefer = function (context, tokenList) {
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
      var newContext = syntax.newContext(context);
      newContext.indent = 3;
      syntax.parseNested(newContext, true);
      var code = newContext.code.join('\n');
      context.defers.push(codeTop + code + codeBottom);
      context.tokenList = newContext.tokenList;
    } else {
      return syntax.throwWordError(lastT);
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
    return syntax.throwWordError(lastT);
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
syntax.parseIf = function (context, tokenList) {
  // runtime.ifCondition()的参数
  var conditions = [];
  
  // 解析执行主体部分
  // TODO: 应该增加 return $$_callback(null) 到末尾
  var parseBody = function () {
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext, true);
    context.tokenList = newContext.tokenList;
    var code = newContext.code.join('\n');
    code = 'function ($$_callback) {\n' +
           code + '\n' +
           syntax.getIndentSpace(context) + '}';
    return code;
  }

  // 取出当前行的条件部分
  // 如 if xx {  或者 elseif xx {
  conditions.push(syntax.parseCondition(tokenList));
  conditions.push(parseBody());

  // 如果下一行是 elseif 或 else ，则继续解析
  var nextW = context.tokenList[0];
  if (nextW && nextW.type === TOKEN.KEYWORD && 
     (nextW.text === 'else' || nextW.text === 'elseif')) {
    for (var ret; ret = syntax.readLine(context.tokenList);) {
      var line = ret.line;
      context.tokenList = ret.next
      var firstT = line[0];
      var nextTs = line.slice(1);

      if (firstT.type === TOKEN.KEYWORD) {
        if (firstT.text === 'elseif') {
          conditions.push(syntax.parseCondition(nextTs));
          conditions.push(parseBody());
        } else if (firstT.text === 'else') {
          conditions.push(parseBody());
        } else {
          //return syntax.throwWordError(firstT);
          context.tokenList = line.concat(context.tokenList);
          break;
        }
      } else {
        //return syntax.throwWordError(firstT);
        context.tokenList = line.concat(context.tokenList);
        break;
      }
    }
  }
 
  // 解析后面的代码
  var newContext = syntax.newContext(context);
  newContext.indent++;
  syntax.parseNested(newContext);
  context.tokenList = newContext.tokenList;
  var nextCode = newContext.code.join('\n');

  var code = '$$_runtime.ifCondition(' + conditions.join(', ') + ', function () {\n' +
             nextCode + '\n' +
             syntax.getIndentSpace(context) + '});';
  syntax.codePushLine(context, code);
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
syntax.parseFor = function (context, tokenList) {
  // 解析后面的代码
  var parseNext = function () {
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext);
    context.tokenList = newContext.tokenList;
    var nextCode = newContext.code.join('\n');
    return nextCode;
  }

  if (tokenList.length >= 3 && tokenList[1].type === TOKEN.KEYWORD && tokenList[1].text === 'in') {
    // 遍历
    if (tokenList[0].type !== TOKEN.IDENTIFIER) {
      return syntax.throwWordError(tokenList[0]);
    }
    var keyName = tokenList[0].text;
    var objName = '';
    tokenList.slice(2, tokenList.length - 1).forEach(function (t) {
      objName += t.text;
    });
    // 解析循环体
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext, true);
    context.tokenList = newContext.tokenList;
    var bodyCode = newContext.code.join('\n');
    var indent = syntax.getIndentSpace(context);
    var code = '$$_runtime.forEachLoop(' + objName + ', function (' + keyName + ', $$_continue, $$_break) {\n' +
                indent + '  var $$_callback = $$_continue;\n' +
                bodyCode + '\n' +
                indent + '}, function () {\n' +
                parseNext() + '\n' +
                indent + '});';
    syntax.codePushLine(context, code);
  } else {
    if (tokenList.length === 1 && tokenList[0].type === TOKEN.SYMBLE && tokenList[0].text === '{') {
      // 无条件循环
      var condition = 'true';
    } else {
      // 条件循环
      var condition = syntax.parseCondition(tokenList);
    }
    // 解析循环体
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext, true);
    context.tokenList = newContext.tokenList;
    var bodyCode = newContext.code.join('\n');
    var indent = syntax.getIndentSpace(context);
    var code = '$$_runtime.conditionLoop(function () {\n' +
                indent + '  return ' + condition + ';\n' +
                indent + '}, function ($$_continue, $$_break) {\n' +
                indent + '  var $$_callback = $$_continue;\n' +
                bodyCode + '\n' +
                indent + '}, function () {\n' +
                parseNext() + '\n' +
                indent + '});';
    syntax.codePushLine(context, code);
  }

};
