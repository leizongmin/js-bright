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
  throw err;
};

/**
 * 添加一行代码
 *
 * @param {Object} code
 * @param {String} line
 */
syntax.codePushLine = function (code, line) {
  var last = code[code.length - 1];
  if (Array.isArray(last)) {
    syntax.codePushLine(last, line);
  } else {
    code.push(line + '\n');
  }
};


/**
 * 开始语法分析
 * 直接返回编译后的js代码
 *
 * @param {Array} words
 * @return {String}
 */
syntax.parse = function (words) {
  var context = {
    args:   [],     // 参数列表
    vars:   [],     // 变量列表
    defers: [],     // 延迟执行列表
    code:   [],     // 生成的js代码
  };

  for (var ret; ret = syntax.readLine(words);) {
    var line = ret.line;
    var words = ret.next
    var firstW = line[0];
    var nextWs = line.slice(1);
    if (firstW.type === WORD.KEYWORD) {
      switch (firstW.text) {

        case 'argument':
          syntax.parseArgument(context, nextWs);
          break;

        case 'var':
          syntax.parseVar(context, nextWs);
          break;

        case 'let':
          syntax.parseLet(context, nextWs);
          break;

      }
    }
  }

  // 生成变量列表声明
  if (context.vars.length > 0) {
    var code = 'var ' + context.vars.join(', ') + ';';
    context.code.unshift(code);
  }

  // 生成最终代码并返回
  var code = '(function (' + context.args.join(', ') + ') {\n"use strict"\n' +
             //syntax.nestingCode(context.code) +
             '\n})();';

  console.log(context);
  return code;
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
 * 输入的单词中，已经去掉了let
 *
 * @param {Object} context
 * @param {Array} words
 */
syntax.parseLet = function (context, words) {
  if (words.length < 3) {
    return syntax.throwWordError(words[words.length - 1], 'Unexpected end of input');
  }
  if (words[0].type !== WORD.IDENTIFIER) {
    return syntax.throwWordError(words[0]);
  }
  if (!(words[1].type === WORD.SYMBLE && words[1].text === '=')) {
    return syntax.throwWordError(words[1]);
  }
  var name = words[0].text;
  if (words[2].type === WORD.KEYWORD) {
    if (words[2].text === 'await') {

    } else if (words[2].text === 'require') {
      if (!words[3]) {
        return syntax.throwWordError(words[2], 'Unexpected end of input')
      }
      syntax.parseRequire(context, name, words.slice(3));
    }
  } else {
    syntax.parseExpression(context, name, words.slice(2));
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
  var code = (name ? 'name = ' : '') + 'require(' + words[0].text + ');';
  syntax.codePushLine(context.code, code);
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
  var isSymble = false;
  var isWord = false;
  var code = '';
  words.forEach(function (w) {
    switch (w.type) {
      case WORD.IDENTIFIER:
      case WORD.NUMBER:
      case WORD.STRING:
        if (isWord) {
          return syntax.throwWordError(w);
        } else {
          isWord = true;
          isSymble = false;
          code += ' ' + w.text;
        }
        break;
      case WORD.SYMBLE:
        if (isSymble) {
          return syntax.throwWordError(w);
        } else {
          isSymble = true;
          isWord = false;
          code += ' ' + w.text;
        }
        break;
      default:
        return syntax.throwWordError(w);
    }
  });
  code = (name ? 'name = ' : '') + code.trim() + ';\n';
  syntax.codePushLine(context.code, code);
};
