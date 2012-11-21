/**
 * EasyScript 运行时库/核心
 *
 * @author 老雷<leizongmin@gmail.com>
 */


var runtime = module.exports;


/**
 * 显示出错信息
 *
 * @param {Object} msg
 */
runtime.error = function () {
  console.error.apply(console, arguments);
};

/**
 * 执行defer语句
 *
 * @param {Array} defers
 * @param {Function} callback
 */
runtime.runDefers = function (defers, callback) {
  var next = function (err) {
    if (err) {
      console.error(err && err.stack);
    }
    var fn = defers.shift();
    if (typeof(fn) !== 'function') {
      return callback(null);
    }
    try {
      fn(next);
    } catch (err) {
      next(err);
    }
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
    if (typeof(end[1]) === 'function') {
      if (lastCondition) {
        end[1](null);
      } else {
        end[0](function () {
          end[1](null);
        });
      }
    } else {
      end[0](null);
    }
  };
  var next = function () {
    var g = groups.shift();
    if (!g) {
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

/**
 * 条件循环
 *
 * @param {Function} test 格式 function () { return true|false; }
 * @param {Function} loop 格式 function (continue, break) { }
 * @param {Function} done 格式 function (callback) { }
 */
runtime.conditionLoop = function (test, loop, done) {
  var next = function () {
    if (test()) {
      loop(next, done);
    } else {
      done();
    }
  };
  next();
};

/**
 * 遍历循环
 *
 * @param {Object|Array} object
 * @param {Function} loop 格式 function (index, continue, break) { }
 * @param {Function} done 格式 function (callback) { }
 */
runtime.forEachLoop = function (object, loop, done) {
  var keys = Object.keys(object);
  var next = function () {
    if (keys.length > 0) {
      var k = keys.shift();
      loop(k, next, done);
    } else {
      done();
    }
  };
  next();
};
