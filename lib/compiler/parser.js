/**
 * EasyScript 编译器/编译代码
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var token = require('./token');

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
  return line + '\n' + line2;
};


/**
 * 编译代码
 *
 * @param {String} source
 * @return {String}
 */
exports.parse = function (source) {
  var words = token.parse(source);
  if (!Array.isArray(words)) {
    var err = new Error(words.error);
    err.line = words.line;
    err.column = words.column;
    var lines = source.split(/\r?\n/gm);
    showErrorLine(lines, err.line, err.column, words.error);
    throw err;
  }
  words.forEach(function (w) {
    process.stdout.write(w.text + ' ');
  });
};





// 测试
exports.parse('if (a + b == 1e1e) {\n\texit(0e0..);\n}');
