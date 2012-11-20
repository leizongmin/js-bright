/**
 * EasyScript
 *
 * @author 老雷<leizongmin@gmail.com>
 */


var runtime = require('./runtime/core');
var define = require('./compiler/define');
var parser = require('./compiler/parser');



/**
 * 编译脚本，返回函数
 *
 * @param {String} source
 * @return {Function}
 */
exports.compile = function (source) {
  var $$_runtime = runtime;
  var $$_javascript = parser.parse(source);
  console.log($$_javascript);
  return eval($$_javascript);
};

