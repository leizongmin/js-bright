/**
 * Tea.js
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var fs = require('fs');
var path = require('path');
var runtime = exports.runtime = require('./runtime/core');
var define = exports.define = require('./compiler/define');
var parser = exports.parser = require('./compiler/parser');


// 是否显示编译出来的js代码
if (/tea/img.test(process.env.DEBUG)) {
  var debug = console.log;
} else {
  var debug = function () { };
}


/**
 * 编译脚本，返回函数
 *
 * @param {String} source
 * @return {Function}
 */
exports.compile = function (source) {
  var $$_runtime = runtime;
  var $$_javascript = parser.parse(source);
  debug($$_javascript);
  return eval($$_javascript);
};


// 注册.tea后缀
require.extensions['.tea'] = function (module, filename) {
  module.exports = exports.compile(fs.readFileSync(filename, 'utf8'));
};
