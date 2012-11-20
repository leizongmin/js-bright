/**
 * EasyScript 编译器/编译代码
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var token = require('./token');
var syntax = require('./syntax');

// 单词类型
var TOKEN = define.TOKEN;


/**
 * 显示出错的行
 *
 * @param {Array} lines
 * @param {Integer} i
 * @param {Integer} column
 * @param {String} err
 * @return {String}
 */
var showErrorLine = function (lines, i, col, err) {
  // 预计控制台窗口宽度为80字符，当单行语句超过50个字符时，自动截断前面的
  var MAXCOL = 50;
  console.log('\x1B[33m');
  console.log('\n');
  console.log(err);
  console.log('Line: ' + (i + 1) + ', Column: ' + (col + 1));
  console.log('');
  var line = lines[i];
  if (line) {
    if (col > MAXCOL) {
      var m = col - MAXCOL;
      line = line.substr(m);
      col -= m;
    }
    console.log(line);
    var line2 = '';
    for (var i = 0; i < col; i++) {
      if (line.charCodeAt(i) <= 32) {
        line2 += line[i];
      } else {
        line2 += ' ';
      }
    }
    console.log(line2 + '^');
  }
  console.log('\x1B[39;49m');
  return line + '\n' + line2;
};


/**
 * 编译代码
 *
 * @param {String} source
 * @return {String}
 */
exports.parse = function (source) {
  // 抛出异常信息
  var _throwError = function (line, column, error) {
    var err = new Error(error);
    err.line = line;
    err.column = column;
    var lines = source.split(/\r?\n/gm);
    showErrorLine(lines, err.line, err.column, error);
    throw err;
  };
  var throwError = function (line, column, error) {
    _throwError(line, column, 'SyntaxError: ' + error);
  }

  // 词法分析
  var tokenList = token.parse(source);
  if (!Array.isArray(tokenList)) {
    return _throwError(tokenList.line, tokenList.column, tokenList.error);
  }

  // 开始语法分析
  try {
    var js = syntax.parse(tokenList);
    return js;
  } catch (err) {
    var t = err.token;
    if (t) {
      throwError(t.line, t.column, err.error);
    } else {
      throw err;
    }
  }
};





// 测试
//exports.parse('a = 1; b = 2;');
//exports.parse('if 0 { b() }');
//console.log(exports.parse('argument x ,y z'));
//console.log(exports.parse('var x ,y z'));
//console.log(exports.parse('let a = require b'));
//console.log(exports.parse('let b = require "b"'));
//console.log(exports.parse('let b = a + b'));
/*
var code = 'argument x, y, z\n' +
           'var a b c\n' +
           'defer xxx\n' + 
           'defer yyy(1,2,3)\n' +
           'defer {\n' +
           '  ooxx()\n' +
           '  xxoo(1,2,3)\n' +
           '  await yy\n' +
           '  let b = await zz\n' +
           '}\n' +
           'let a = require b\n' +
           'require "xxx"\n' +
           'let b = await x.y\n' +
           'let b = await y(1,2,3)\n' +
           'var e\n' +
           'let z = false\n' + 
           'let c = (20 + 5) / 4\n' +
           'require x\n' +
           'await z\n' +
           'let a,b,c = await z(3)\n' +
           'let a b = await x\n' +
           'let a = c(1,2,3)\n' +
           'ooxx(a[0 + Math.sin(50)])\n' +
           'return\n' +
           'return a b 123\n' +
           'let ret = a[0][1]\n' +
           'return ret\n' +
           'if a + b = c {\n' +
           '  let b = 2\n' +
           '} elseif b + b {\n' +
           '  let c = 55455\n' +
           '} else {\n' +
           '  let d = await cc\n' +
           '}\n' +
           'await bbb\n' +
           'return 12345\n' +
           'for a >= b {\n' +
           '  await bb\n' +
           '  break\n' +
           '  continue\n' +
           '}\n' +
           'for i in obj.xx {\n' +
           '  await cc\n' +
           '}\n' +
           'await bb';
var js = exports.parse(code);           
console.log(js);
console.log(eval(js));
*/
