/**
 * bright
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var fs = require('fs');
var path = require('path');
var runtime = exports.runtime = require('./runtime/core');
var define = exports.define = require('./compiler/define');
var parser = exports.parser = require('./compiler/parser');


// 检查当前运行环境
if (typeof(window) === 'undefined') {
  var isBrowser = false;
} else {
  var isBrowser = true;
}
var isNode = !isBrowser;


// 是否显示编译出来的js代码，开启输出调试代码的方法：
// Node.js:   设置环境变量 DEBUG=bright
// 浏览器：   window._BRIGHT_DEBUG= true
if ((isNode && /bright/img.test(process.env.DEBUG)) || (isBrowser && typeof(_BRIGHT_DEBUG) !== 'undefined')) {
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



if (isNode) {
  // 在Node.js环境下
  // 注册.bright后缀
  require.extensions['.bright'] = function (module, filename) {
    module.exports = exports.load(filename);
  };

  /**
   * 编译模块文件
   *
   * @param {String} filename
   * @return {Object}
   */
  exports.load = function (filename) {
    var source = fs.readFileSync(filename, 'utf8');
    var js = parser.parse(source);
    js = 'var $$_runtime = require("bright").runtime;\n' +
         js + '(function (err) {\n' +
         '  if (err) console.error(err && err.stack);\n' +
         '});';
    var target = filename + '.compile.js';
    fs.writeFileSync(target, js);
    return require(target);
  };

} else {
  // 在Browser环境下
  // 注册Bright命名空间
  if (typeof(window.Bright) === 'undefined') {
    window.Bright = module.exports;
  } else {
    console.error('Cannot register namespace "Bright".');
  }

  var run = function (source) {
    var fn = exports.compile(source);
    fn(function (err) {
      if (err) console.error(err && err.stack);
    });
  };

  /**
   * 编译模块文件
   *
   * @param {String} url
   * @param {Function} callback
   */
  exports.load = function (url, callback) {
    var xhr = window.ActiveXObject ? new window.ActiveXObject('Microsoft.XMLHTTP') : new XMLHttpRequest();
    xhr.open('GET', url, true);
    if ('overrideMimeType' in xhr) {
      xhr.overrideMimeType('text/plain');
    }
    xhr.onreadystatechange = function () {
      var _ref;
      if (xhr.readyState === 4) {
        if ((_ref = xhr.status) === 0 || _ref === 200) {
          run(xhr.responseText);
        } else {
          throw new Error("Could not load " + url);
        }
        if (callback) {
          return callback();
        }
      }
    };
    return xhr.send(null);
  };

  // 自动执行使用<script>标签引用的程序
  var runScripts = function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0, len = scripts.length; i < len; i++) {
      var s = scripts[i];
      if (s && s.type && s.type === 'text/bright') {
        if (s.src) {
          exports.load(s.src);
        } else {
          run(s.innerHTML);
        }
      }
    }
  };
  if (window.addEventListener) {
    addEventListener('DOMContentLoaded', runScripts, false);
  } else {
    attachEvent('onload', runScripts);
  }

}
