/**
 * EasyScript 运行时库/核心
 *
 * @author 老雷<leizongmin@gmail.com>
 */


var runtime = module.exports;


/**
 * 执行defer语句
 *
 * @param {Array} defers
 * @param {Function} callback
 */
runtime.runDefers = function (defers, callback) {
  var next = function () {
    var fn = defers.shift();
    if (typeof(fn) !== 'function') {
      return callback(null);
    }
    try {
      fn();
    } catch (err) {
      console.error(err && err.stack);
    }
    next();
  }
  next();
};

