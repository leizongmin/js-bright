/**
 * EasyScript 编译器/编译代码
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var token = require('./token');
var syntax = require('./syntax');

// 单词类型
var WORD = define.WORD;


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
  console.log('Line: ' + (i + 1) + ', Column: ' + col);
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
  var words = token.parse(source);
  if (!Array.isArray(words)) {
    return _throwError(words.line, words.column, words.error);
  }

  // 开始语法分析
  try {
    var js = syntax.parse(words);
    return js;
  } catch (err) {
    var w = err.word;
    if (w) {
      throwError(w.line, w.column, err.error);
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

var code = 'argument x, y, z\n' +
           'var a b c\n' +
           'let a = require b\n' +
           'let b = await x\n' +
           'let b = await y(1,2,3)\n' +
           'var e\n' +
           'let x = (20 + 5) / 4\n'
console.log(exports.parse(code));
