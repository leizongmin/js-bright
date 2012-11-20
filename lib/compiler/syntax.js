/**
 * EasyScript 编译器/语法分析
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
  err.token = w;
  console.log(err.stack);
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
 * @return {Array}
 */
syntax.addReturnAtEnd = function (tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  if (lastT) {
    var wReturn = {
      type:   TOKEN.KEYWORD,
      line:   lastT.line + 1,
      column: 0,
      text:   'return'
    };
    tokenList.push(wReturn);
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
    if (firstT.type === TOKEN.KEYWORD) {
      var nextNextToken = function () {
        if (nextTs.length < 1) {
          return syntax.throwWordError(firstT, 'Unexpected end of input');
        }
      };
      switch (firstT.text) {

        case 'argument':
          nextNextToken();
          syntax.parseArgument(context, nextTs);
          break;

        case 'var':
          nextNextToken();
          syntax.parseVar(context, nextTs);
          break;

        case 'let':
          nextNextToken();
          syntax.parseLet(context, nextTs);
          break;

        case 'require':
          nextNextToken();
          syntax.parseRequire(context, '', nextTs);
          break;

        case 'await':
          nextNextToken();
          syntax.parseAwait(context, '', nextTs);
          break;

        case 'return':
          syntax.parseReturn(context, nextTs);
          break;

        case 'defer':
          nextNextToken();
          syntax.parseDefer(context, nextTs);
          break;

        case 'if':
          nextNextToken();
          syntax.parseIf(context, nextTs);
          break;

        case 'for':
          nextNextToken();
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
      defersCode.push(indent + '$$_callback = function () {');
      defersCode.push(indent + '  var $$_args = arguments;');
      defersCode.push(indent + '  $$_runtime.runDefers($$_defers, function (err) {');
      defersCode.push(indent + '    if (err) console.error(err.stack);');
      defersCode.push(indent + '    $$_oldCallback.apply(null, $$_args);');
      defersCode.push(indent + '  });');
      defersCode.push(indent + '};')
      defersCode = defersCode.join('\n') + '\n';
    } else {
      defersCode = '';
    }

    // 生成最终代码并返回
    context.args.push('$$_callback')
    var code = '(function (' + context.args.join(', ') + ') {\n' +
               '  "use strict";\n' +
               '  try {\n' +
               varsCode +
               defersCode +
               context.code.join('\n') + '\n' +
               '  } catch (err) {\n' +
               '    return $$_callback(err);\n' +
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
    var line = ret.line;
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
    body = syntax.addReturnAtEnd(body);
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
 *                  或者省略逗号，如 let a b c = await fn()
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
  var names = [];
  var isComma = true;
  for (var i = 0, len = tokenList.length; i < len; i++) {
    var t = tokenList[i];
    if (t.type === TOKEN.IDENTIFIER) {
      isComma = false;
      names.push(t.text);
      // 如果变量未声明，自动声明
      if (context.vars.indexOf(t.text) === -1) {
        context.vars.push(t.text);
      }
    } else if (!isComma && t.type === TOKEN.SYMBLE) {
      if (t.text === ',') {
        isComma = true;
      } else if (t.text === '=') {
        break;
      } else {
        return syntax.throwWordError(t);
      }
    } else {
      return syntax.throwWordError(t);
    }
  }
  var name = names.join(', ');
  var _tokenList = tokenList.slice(i + 1);
  if (_tokenList.length < 1) {
    return syntax.throwWordError(tokenList[tokenList.length - 1], 'Unexpected end of input');
  } else {
    tokenList = _tokenList;
  }

  if (tokenList[0].type === TOKEN.KEYWORD) {
    if (tokenList[0].text === 'await') {
      if (!tokenList[1]) {
        return syntax.throwWordError(tokenList[0], 'Unexpected end of input')
      }
      syntax.parseAwait(context, name, tokenList.slice(1));
    } else if (tokenList[0].text === 'require') {
      if (names.length > 1) {
        return syntax.throwWordError(tokenList[0], 'Not support tuple assignment');
      }
      if (!tokenList[1]) {
        return syntax.throwWordError(tokenList[0], 'Unexpected end of input')
      }
      syntax.parseRequire(context, name, tokenList.slice(1));
    } else {
      return syntax.throwWordError(tokenList[0]);
    }
  } else {
    if (names.length > 1) {
      return syntax.throwWordError(tokenList[0], 'Not support tuple assignment');
    }
    syntax.parseExpression(context, name, tokenList.slice(0));
  }
};

/**
 * 解析require语句
 * 格式为： require "abc" 或者使用变量 require x
 * 输入的单词中，已经去掉了require
 *
 * @param {Object} context
 * @param {String} name 保存的变量名称，可以为空
 * @param {Array} tokenList
 */
syntax.parseRequire = function (context, name, tokenList) {
  if (tokenList.length !== 1) {
    return syntax.throwWordError(tokenList[0]);
  }
  if (!(tokenList[0].type === TOKEN.IDENTIFIER || tokenList[0].type === TOKEN.STRING)) {
    return syntax.throwWordError(tokenList[0]);
  }
  var code = (name ? name + ' = ' : '') + 'require(' + tokenList[0].text + ');';
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
    switch (t.type) {
      case TOKEN.IDENTIFIER:
      case TOKEN.NUMBER:
      case TOKEN.STRING:
      case TOKEN.SYMBLE:
        code += t.text;
        break;
      default:
        return syntax.throwWordError(t);
    }
  });
  code = (name ? name + ' = ' : '') + code.trim() + ';';
  syntax.codePushLine(context, code);
};

/**
 * 解析await语句
 * 格式为： await xxx  或者 await xxx() 或者带参数 await xxx(a, b)
 * 输入的单词中，已经去掉了await
 *
 * @param {Object} context
 * @param {String} name
 * @param {Array} tokenList
 */
syntax.parseAwait = function (context, name, tokenList) {
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
  // 生成 function ($$_err, name) {
  call += 'function ($$_err' + (name ? ', ' + name : '') + ') {';
  syntax.codePushLine(context, call);
  context.indent++;
  syntax.codePushLine(context, 'if ($$_err) throw $$_err;');
  syntax.parse(context, true);
  context.indent--;
  syntax.codePushLine(context, '});');
};

/**
 * 解析return语句
 * 格式为： return x 或者多个返回值 return a,b,c
 *                       多个返回值之间可以省略逗号，如 return a b c
 *   返回值只能是数值或者标识符，不能有其他运算符
 * 输入的单词中，已经去掉了return
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
syntax.parseReturn = function (context, tokenList) {
  var values = ['null'];
  if (tokenList.length > 0) {
    // 有返回值
    var isComma = true;
    for (var i = 0, len = tokenList.length; i < len; i++) {
      var t = tokenList[i];
      if (t.type === TOKEN.IDENTIFIER || t.type === TOKEN.NUMBER) {
        isComma = false;
        values.push(t.text);
      } else if (!isComma && t.type === TOKEN.SYMBLE && t.text === ',') {
        isComma = true;
      } else {
        return syntax.throwWordError(t);
      }
    }
  }
  syntax.codePushLine(context, 'return $$_callback(' + values.join(', ') + ');');
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
  var codeTop = 'function ($$_callback) {\n';
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
      condition = 'true';
    } else {
      // 条件循环
      condition = syntax.parseCondition(tokenList);
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
