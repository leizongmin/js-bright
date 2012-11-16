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
  var space = '';
  for (var i = 0; i < context.indent; i++) {
    space += '  ';
  }
  context.code.push(space + line);
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
      words:  words,  // 剩下的单词列表
      args:   [],     // 参数列表
      vars:   [],     // 变量列表
      defers: [],     // 延迟执行列表
      code:   [],     // 生成的js代码
      indent: 2,      // 缩进
    };
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

    // 生成最终代码并返回
    context.args.push('$$_callback')
    var code = '(function (' + context.args.join(', ') + ') {\n' +
               '  "use strict";\n' +
               '  try {\n' +
               '    ' + varsCode + 
               context.code.join('\n') + '\n' +
               '  } catch (err) {\n' +
               '    return $$_callback(err);\n' +
               '  }\n' +
               '})();';

    //console.log(context);
    return code;
  }
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
  if (words.length > 1) {
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
