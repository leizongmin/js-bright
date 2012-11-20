/**
 * EasyScript 编译器/语法分析
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var token = require('./token');

// 单词类型
var WORD = define.WORD;


var syntax = module.exports;


/**
 * 读取一行
 * 返回FALSE表示已经到底末尾
 *
 * @param {Array} words
 * @return {Object}
 *   - {Array} line 当前行
 *   - {Array} next 剩下部分
 */
syntax.readLine = function (words) {
  if (words[0]) {
    var lineNum = words[0].line;
    for (var i = 1, len = words.length; i < len; i++) {
      if (words[i].line !== lineNum) {
        break;
      }
    }
    return {
      line:   words.slice(0, i),
      next:   words.slice(i)
    };
  } else {
    return false;
  }
};

/**
 * 抛出异常
 *
 * @param {Object} w
 * @param {String} e
 */
syntax.throwWordError = function (w, e) {
  if (!e) {
    e = 'Unexpected token ' + w.text;
  }
  var err = new Error(e);
  err.error = e;
  err.word = w;
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
 * @param {Array} words
 * @return {Array}
 */
syntax.addReturnAtEnd = function (words) {
  var lastW = words[words.length - 1];
  if (lastW) {
    var wReturn = {
      type:   WORD.KEYWORD,
      line:   lastW.line + 1,
      column: 0,
      text:   'return'
    };
    words.push(wReturn);
  }
  return words;
};

/**
 * 解析条件
 *
 * @param {Array} words
 * @return {String}
 */
syntax.parseCondition = function (words) {
  var lastW = words[words.length - 1];
  if (!(lastW.type === WORD.SYMBLE && lastW.text === '{')) {
    return syntax.throwWordError(lastW);
  }
  // 取出条件部分
  words.pop();
  var cond = '';
  words.forEach(function (w) {
    // 将等于号=转化成==
    if (w.type === WORD.SYMBLE && w.text === '=') {
      cond += ' == ';
    } else {
      cond += w.text;
    }
  });
  return '(' + cond + ')';
};

/**
 * 开始语法分析
 * 直接返回编译后的js代码
 *
 * @param {Array|Object} words
 * @param {Boolean} isNested
 * @return {String}
 */
syntax.parse = function (words, isNested) {
  if (isNested) {
    var context = words;
  } else {
    var context = {   
      args:   [],     // 参数列表，全局
      vars:   [],     // 变量列表，全局
      defers: [],     // 延迟执行列表
      words:  words,  // 剩下的单词列表
      code:   [],     // 生成的js代码
      indent: 2,      // 缩进
    };
  }

  // 自动在末尾增加return语句
  if (!isNested) {
    context.words = syntax.addReturnAtEnd(context.words);
  }

  for (var ret; ret = syntax.readLine(context.words);) {
    var line = ret.line;
    context.words = ret.next
    var firstW = line[0];
    var nextWs = line.slice(1);
    if (firstW.type === WORD.KEYWORD) {
      var needNextWord = function () {
        if (nextWs.length < 1) {
          return syntax.throwWordError(firstW, 'Unexpected end of input');
        }
      };
      switch (firstW.text) {

        case 'argument':
          needNextWord();
          syntax.parseArgument(context, nextWs);
          break;

        case 'var':
          needNextWord();
          syntax.parseVar(context, nextWs);
          break;

        case 'let':
          needNextWord();
          syntax.parseLet(context, nextWs);
          break;

        case 'require':
          needNextWord();
          syntax.parseRequire(context, '', nextWs);
          break;

        case 'await':
          needNextWord();
          syntax.parseAwait(context, '', nextWs);
          break;

        case 'return':
          syntax.parseReturn(context, nextWs);
          break;

        case 'defer':
          needNextWord();
          syntax.parseDefer(context, nextWs);
          break;

        case 'if':
          needNextWord();
          syntax.parseIf(context, nextWs);
          break;

        case 'for':
          needNextWord();
          syntax.parseFor(context, nextWs);
          break;

        case 'break':
          syntax.codePushLine(context, 'return $$_break(null);');
          break;

        case 'continue':
          syntax.codePushLine(context, 'return $$_continue(null);');
          break;

        default:
          return syntax.throwWordError(firstW);
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
      var varsCode = 'var ' + context.vars.join(', ') + ';\n';
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
    }

    // 生成最终代码并返回
    context.args.push('$$_callback')
    var code = '(function (' + context.args.join(', ') + ') {\n' +
               '  "use strict";\n' +
               '  try {\n' +
               '    ' + varsCode +
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
  var words = context.words;
  var ret;
  var body = [];
  var brace = 0;
  while (ret = syntax.readLine(words)) {
    words = ret.next;
    var line = ret.line;
    var firstW = line[0];
    var lastW = line[line.length - 1];
    if (firstW.type === WORD.SYMBLE && firstW.text === '}') {
      brace--;
    } else if (lastW.type === WORD.SYMBLE && lastW.text === '{') {
      brace++;
    }
    if (brace < 0) {
      // 如果末尾为这种情况：  } else {
      // 把 else { 接到剩余的单词前面
      if (line.length > 1) {
        words = line.slice(1).concat(words);
      }
      break;
    } else {
      body = body.concat(line);  
    }
  }
  if (isReturn) {
    body = syntax.addReturnAtEnd(body);
  }
  context.words = body;
  syntax.parse(context, true);
  context.words = words;
};

/**
 * 解析argument语句
 * 格式为： argument x,y,z 或者省略逗号： argument x y z
 * 输入的单词中，已经去掉了argument
 *
 * @param {Object} context
 * @param {Array} words
 */
syntax.parseArgument = function (context, words) {
  var isComma = false;
  words.forEach(function (w) {
    if (w.type === WORD.IDENTIFIER) {
      isComma = false;
      context.args.push(w.text);
    } else if (w.type === WORD.SYMBLE && w.text === ',' && !isComma) {
      isComma = true;
    } else {
      syntax.throwWordError(w);
    }
  });
};

/**
 * 解析var语句
 * 格式为： var x,y,z 或者省略逗号： var x y z
 * 输入的单词中，已经去掉了var
 *
 * @param {Object} context
 * @param {Array} words
 */
syntax.parseVar = function (context, words) {
  var isComma = false;
  words.forEach(function (w) {
    if (w.type === WORD.IDENTIFIER) {
      isComma = false;
      context.vars.push(w.text);
    } else if (w.type === WORD.SYMBLE && w.text === ',' && !isComma) {
      isComma = true;
    } else {
      syntax.throwWordError(w);
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
 * @param {Array} words
 */
syntax.parseLet = function (context, words) {
  if (words.length < 3) {
    return syntax.throwWordError(words[words.length - 1], 'Unexpected end of input');
  }
  
  // 分析变量名，直到遇到等于号才结束
  var names = [];
  var isComma = true;
  for (var i = 0, len = words.length; i < len; i++) {
    var w = words[i];
    if (w.type === WORD.IDENTIFIER) {
      isComma = false;
      names.push(w.text);
      // 如果变量未声明，自动声明
      if (context.vars.indexOf(w.text) === -1) {
        context.vars.push(w.text);
      }
    } else if (!isComma && w.type === WORD.SYMBLE) {
      if (w.text === ',') {
        isComma = true;
      } else if (w.text === '=') {
        break;
      } else {
        return syntax.throwWordError(w);
      }
    } else {
      return syntax.throwWordError(w);
    }
  }
  var name = names.join(', ');
  var _words = words.slice(i + 1);
  if (_words.length < 1) {
    return syntax.throwWordError(words[words.length - 1], 'Unexpected end of input');
  } else {
    words = _words;
  }

  if (words[0].type === WORD.KEYWORD) {
    if (words[0].text === 'await') {
      if (!words[1]) {
        return syntax.throwWordError(words[0], 'Unexpected end of input')
      }
      syntax.parseAwait(context, name, words.slice(1));
    } else if (words[0].text === 'require') {
      if (names.length > 1) {
        return syntax.throwWordError(words[0], 'Not support tuple assignment');
      }
      if (!words[1]) {
        return syntax.throwWordError(words[0], 'Unexpected end of input')
      }
      syntax.parseRequire(context, name, words.slice(1));
    } else {
      return syntax.throwWordError(words[0]);
    }
  } else {
    if (names.length > 1) {
      return syntax.throwWordError(words[0], 'Not support tuple assignment');
    }
    syntax.parseExpression(context, name, words.slice(0));
  }
};

/**
 * 解析require语句
 * 格式为： require "abc" 或者使用变量 require x
 * 输入的单词中，已经去掉了require
 *
 * @param {Object} context
 * @param {String} name 保存的变量名称，可以为空
 * @param {Array} words
 */
syntax.parseRequire = function (context, name, words) {
  if (words.length !== 1) {
    return syntax.throwWordError(words[0]);
  }
  if (!(words[0].type === WORD.IDENTIFIER || words[0].type === WORD.STRING)) {
    return syntax.throwWordError(words[0]);
  }
  var code = (name ? name + ' = ' : '') + 'require(' + words[0].text + ');';
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
 * @param {Array} words
 */
syntax.parseExpression = function (context, name, words) {
  var code = '';
  words.forEach(function (w) {
    switch (w.type) {
      case WORD.IDENTIFIER:
      case WORD.NUMBER:
      case WORD.STRING:
      case WORD.SYMBLE:
        code += w.text;
        break;
      default:
        return syntax.throwWordError(w);
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
 * @param {Array} words
 */
syntax.parseAwait = function (context, name, words) {
  if (words[0].type !== WORD.IDENTIFIER) {
    return syntax.throwWordError(words[0]);
  }
  var lastW = words[words.length - 1];
  if (lastW.type === WORD.SYMBLE && lastW.text === ')') {
    // 生成 xxx(a, b, 
    var call = '';
    words.slice(0, words.length - 1).forEach(function (w) {
      call += w.text;
    });
    call += ', ';
  } else {
    // 生成 xxx(
    var call = '';
    words.forEach(function (w) {
      call += w.text;
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
 * @param {Array} words
 */
syntax.parseReturn = function (context, words) {
  var values = ['null'];
  if (words.length > 0) {
    // 有返回值
    var isComma = true;
    for (var i = 0, len = words.length; i < len; i++) {
      var w = words[i];
      if (w.type === WORD.IDENTIFIER || w.type === WORD.NUMBER) {
        isComma = false;
        values.push(w.text);
      } else if (!isComma && w.type === WORD.SYMBLE && w.text === ',') {
        isComma = true;
      } else {
        return syntax.throwWordError(w);
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
 * @param {Array} words
 */
syntax.parseDefer = function (context, words) {
  var lastW = words[words.length - 1];
  var codeTop = 'function ($$_callback) {\n';
  var codeBottom = '\n    }';
  if (lastW.type === WORD.SYMBLE) {
    if (lastW.text === ')' && words.length >= 3) {
      // defer xxx() 情况
      var call = '';
      words.forEach(function (w) {
        call += w.text;
      });
      call = '      ' + call + ';\n      return $$_callback(null);';
      context.defers.push(codeTop + call + codeBottom);
    } else if (lastW.text === '{' && words.length === 1) {
      // defer {    情况
      var newContext = syntax.newContext(context);
      newContext.indent = 3;
      syntax.parseNested(newContext, true);
      var code = newContext.code.join('\n');
      context.defers.push(codeTop + code + codeBottom);
      context.words = newContext.words;
    } else {
      return syntax.throwWordError(lastW);
    }
  } else if (lastW.type === WORD.IDENTIFIER) {
    // defer xxx 情况
    var call = '';
    words.forEach(function (w) {
      call += w.text;
    });
    call = '      ' + call + '();\n      return $$_callback(null);';
    context.defers.push(codeTop + call + codeBottom);
  } else {
    return syntax.throwWordError(lastW);
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
 * @param {Array} words
 */
syntax.parseIf = function (context, words) {
  // runtime.ifCondition()的参数
  var conditions = [];
  
  // 解析执行主体部分
  // TODO: 应该增加 return $$_callback(null) 到末尾
  var parseBody = function () {
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext, true);
    context.words = newContext.words;
    var code = newContext.code.join('\n');
    code = 'function ($$_callback) {\n' +
           code + '\n' +
           syntax.getIndentSpace(context) + '}';
    return code;
  }

  // 取出当前行的条件部分
  // 如 if xx {  或者 elseif xx {
  conditions.push(syntax.parseCondition(words));
  conditions.push(parseBody());

  // 如果下一行是 elseif 或 else ，则继续解析
  var nextW = context.words[0];
  if (nextW && nextW.type === WORD.KEYWORD && 
     (nextW.text === 'else' || nextW.text === 'elseif')) {
    for (var ret; ret = syntax.readLine(context.words);) {
      var line = ret.line;
      context.words = ret.next
      var firstW = line[0];
      var nextWs = line.slice(1);

      if (firstW.type === WORD.KEYWORD) {
        if (firstW.text === 'elseif') {
          conditions.push(syntax.parseCondition(nextWs));
          conditions.push(parseBody());
        } else if (firstW.text === 'else') {
          conditions.push(parseBody());
        } else {
          //return syntax.throwWordError(firstW);
          context.words = line.concat(context.words);
          break;
        }
      } else {
        //return syntax.throwWordError(firstW);
        context.words = line.concat(context.words);
        break;
      }
    }
  }
 
  // 解析后面的代码
  var newContext = syntax.newContext(context);
  newContext.indent++;
  syntax.parseNested(newContext);
  context.words = newContext.words;
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
 * @param {Array} words
 */
syntax.parseFor = function (context, words) {
  // 解析后面的代码
  var parseNext = function () {
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext);
    context.words = newContext.words;
    var nextCode = newContext.code.join('\n');
    return nextCode;
  }

  if (words.length >= 3 && words[1].type === WORD.KEYWORD && words[1].text === 'in') {
    // 遍历
    if (words[0].type !== WORD.IDENTIFIER) {
      return syntax.throwWordError(words[0]);
    }
    var keyName = words[0].text;
    var objName = '';
    words.slice(2, words.length - 1).forEach(function (w) {
      objName += w.text;
    });
    // 解析循环体
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext, true);
    context.words = newContext.words;
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
    if (words.length === 1 && words[0].type === WORD.SYMBLE && words[0].text === '{') {
      // 无条件循环
      condition = 'true';
    } else {
      // 条件循环
      condition = syntax.parseCondition(words);
    }
    // 解析循环体
    var newContext = syntax.newContext(context);
    newContext.indent++;
    syntax.parseNested(newContext, true);
    context.words = newContext.words;
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
