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

/**
 * 执行条件判断
 *
 * 可以接受多个elsif，如 if [条件] [回调] elseif [条件] [回调] else [回调] [所有完成回调]
 * 参数为： 条件1 回调1 | 条件2 回调2 | 条件3 回调3 |所有条件不满足回调 完成后回调
 *            0     1   |   2     3   |  4     5    |         6             7
 * 每两个为一组，最后一组为else和最终回调
 *
 * @param {Boolean} condition
 * @param {Function} todo 格式 function (callback) {}
 * @param {Function} else 格式 function (callback) {}
 * @param {Function} done 格式 function (callback) {}
 */
runtime.ifCondition = function () {
  var groups = [];
  for (var i = 0, len = arguments.length; i < len; i += 2) {
    var g = [arguments[i], arguments[i + 1]];
    groups.push(g);
  }
  var end = groups.pop();
  var lastCondition = false;
  var done = function () {
    if (end.length === 1) {
      end[0]();
    } else {
      end[0](function () {
        end[1];
      });
    }
  };
  var next = function () {
    var g = groups.shift();
    if (typeof(g[0]) === 'function') {
      // 最后一组
      done();
    } else {
      // 判断条件，决定是否执行
      lastCondition = g[0];
      if (g[0]) {
        g[1](next);
      } else {
        next();
      }
    }
  };
  next();
};
