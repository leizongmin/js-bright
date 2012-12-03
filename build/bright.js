(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/lib/index.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * bright
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var fs = require('fs');
var path = require('path');
require('./browser_support');

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


var runtime = exports.runtime = require('./runtime/core');
var define = exports.define = require('./compiler/define');
var parser = exports.parser = require('./compiler/parser');



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
  return eval('false || ' + $$_javascript);
};

/**
 * 封装文件
 *
 * @param {String} source
 * @return {Strin}
 */
exports._wrapFile = function (source) {
  return '(function () {\n' +
         exports._wrapGetRuntime() +
         source + '(function (err) {\n' +
         '  if (err) console.error(err && err.stack);\n' +
         '});\n' +
         '})();';
};

/**
 * 封装runtime代码
 *
 * @return {String}
 */
exports._wrapGetRuntime = function () {
  return '\nif (typeof(window) === "undefined") {\n' +
         '  var $$_runtime = require("bright").runtime;\n' +
         '} else {\n' +
         '  var $$_runtime = Bright.runtime;\n' +
         '}\n';
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
    js = 'var $$_runtime = (global.Bright || require("bright")).runtime;\n' +
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

  /**
   * 运行bright脚本
   *
   * @param {String} source
   */
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

});

require.define("fs",function(require,module,exports,__dirname,__filename,process,global){// nothing to see here... no file methods for the browser

});

require.define("/lib/browser_support.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * 支持低版本的浏览器
 *
 * @author 老雷<leizongmin@gmail.com>
 */

// 如果浏览器不支持Array.forEach()，则添加
if (typeof(Array.prototype.forEach) !== 'function') {
  Array.prototype.forEach = function (cb) {
    var len = this.length;
    for (var i = 0; i < len; i++) {
      cb(this[i], i, this);
    }
  };
}
// 如果浏览器不支持Array.indexOf，则添加
if (typeof(Array.prototype.indexOf) !== 'function') {
  Array.prototype.indexOf = function (obj) {                 
    for (var i = 0, len = this.length; i < len; i++) {
      if (this[i] === obj) {
        return i;
      }
    }
    return -1;
  };
}
// 如果浏览器不支持Array.isArray()，则添加
if (typeof(Array.isArray) !== 'function') {
  Array.isArray  = function (arr) {
    return (arr instanceof Array) ? true : false;
  };
}
// 如果浏览器不支持String.trim()，则添加
if (typeof(String.prototype.trim) !== 'function') {
  String.prototype.trim = function () {
    return this.replace(/^\s*((?:[\S\s]*\S)?)\s*$/, '$1');
  };
}

});

require.define("/lib/runtime/core.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * bright 运行时库/核心
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
 * @param {Object} error
 * @param {Function} callback
 */
runtime.runDefers = function (defers, error, callback) {
  var next = function (err) {
    if (err) {
      console.error(err && err.stack);
    }
    var fn = defers.shift();
    if (typeof(fn) !== 'function') {
      return callback(null);
    }
    try {
      fn(error, next);
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
    if (!g || lastCondition) {
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

/**
 * 等待一段时间
 *
 * @param {Integer} intval
 * @param {Function} callback
 */
runtime.sleep = function (intval, callback) {
  setTimeout(function () {
    callback(null, intval);
  }, intval);
};

/**
 * 解析函数参数
 *
 * @param {Array} args
 * @return {Object}
 *   - {Array} arguments
 *   - {Function} callback
 */
runtime.parseArguments = function (args) {
  var ret = {arguments: []};
  ret.callback = args[args.length - 1];
  for (var i = 0, len = args.length - 1; i < len; i++) {
    ret.arguments.push(args[i]);
  }
  return ret;
};

});

require.define("/lib/compiler/define.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * bright 编译器/常量定义
 *
 * @author 老雷<leizongmin@gmail.com>
 */


// 单词类型
exports.TOKEN = {
  BLANK:      0,    // 空白
  SYMBLE:     1,    // 符号
  NUMBER:     2,    // 数值
  STRING:     4,    // 字符串
  NAME:       8,    // 名称（可能为关键字或标识符）
  KEYWORD:    16,   // 关键词
  IDENTIFIER: 32,   // 标识符
  COMMENT:    64    // 注释
};


// 关键字列表
exports.KEYWORD = [
  'await',
  'argument',
  'break',
  'continue',
  'defer',
  'else',
  'elseif',
  'false',
  'for',
  'function',
  'if',
  'in',
  'javascript',
  'let',
  'NaN',
  'null',
  'return',
  'sleep',
  'throw',
  'true',
  'undefined',
  'var'
];

});

require.define("/lib/compiler/parser.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * bright 编译器/编译代码
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
  console.error('\x1B[33m');
  console.error('\n');
  console.error(err);
  console.error('Line: ' + (i + 1) + ', Column: ' + (col + 1));
  console.error('');
  var line = lines[i];
  if (line) {
    if (col > MAXCOL) {
      var m = col - MAXCOL;
      line = line.substr(m);
      col -= m;
    }
    console.error(line);
    var line2 = '';
    for (var i = 0; i < col; i++) {
      if (line.charCodeAt(i) <= 32) {
        line2 += line[i];
      } else {
        line2 += ' ';
      }
    }
    console.error(line2 + '^');
  }
  console.error('\x1B[39;49m');
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
    if (tokenList instanceof Error) {
      return _throwError(0, 0, tokenList.message);
    } else {
      return _throwError(tokenList.line, tokenList.column, tokenList.error);
    }
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

});

require.define("/lib/compiler/token.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * bright 编译器/词法分析
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');

// 单词类型
var TOKEN = define.TOKEN;

// 关键字列表
var KEYWORD = define.KEYWORD;
var _KEYWORD = {};
KEYWORD.forEach(function (w) {
  _KEYWORD[w] = true;
});

// 词法分析状态
var STATUS = {
  BLANK:      0,          // 空白字符
  SYMBLE:     1,          // 符号
  NUMBER:     2,          // 数值
  STRING:     4,          // 字符串
  NAME:       8,          // 名称（可能为关键字或标识符）
  COMMENT_1:  16,         // "//"开头的单行注释
  COMMENT_2:  32          // "/*"开头的多行注释
};

// 字符ASCII编码
var CHAR = {
  NUMBER_BEGIN:   48,     // 数字 0
  NUMBER_END:     57,     // 数字 9
  LOWER_BEGIN:    97,     // 字母 a
  LOWER_END:      122,    // 字母 z
  UPPER_BEGIN:    65,     // 字母 A
  UPPER_END:      90,     // 字母 Z
  UNDERLINE:      95,     // 下划线 _
  QUOTE_1:        39,     // 单引号 '
  QUOTE_2:        34,     // 双引号 "
  BACKSLASH:      92,     // 反斜杠 \
  DOLLAR:         36,     // 美元符号 $
  STAR:           42,     // 星号 *
  FORWARDSLASH:   47      // 斜杠 /
};

/**
 * 判断字符是否为数字
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isNumber = function (c) {
  return c >= CHAR.NUMBER_BEGIN && c <= CHAR.NUMBER_END ? true : false;
};

/**
 * 判断字符是否为字母
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isLetter = function (c) {
  return (c >= CHAR.UPPER_BEGIN && c <= CHAR.UPPER_END) ||
         (c >= CHAR.LOWER_BEGIN && c <= CHAR.LOWER_END) ||
         c === CHAR.UNDERLINE || c === CHAR.DOLLAR
         ? true : false;
};

/**
 * 判断是否为空白字符
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isBlank = function (c) {
  return isNaN(c) || c <= 32 ? true : false;
};

/**
 * 判断字符是否为引号
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isQuote = function (c) {
  return c === CHAR.QUOTE_1 || c === CHAR.QUOTE_2 ? true : false;
};

/**
 * 判断字符是否为换行符
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isNewLine = function (c) {
  return c === 10 || c === 13 ? true : false;
};

/**
 * 是否为关键字
 *
 * @param {String} w
 * @return {Boolean}
 */
var isKeyword = function (w) {
  return _KEYWORD[w] ? true : false;
};


/**
 * 分析代码，返回单词数组（未判断关键词）
 * 
 * 返回一个对象表示出错：{error: '出错信息', line: 行, column: 列}
 * 每个数组元素结构：{type: 单词类型, line: 行号, column: 当前行的位置, text: 单词}
 * 行号和位置从0开始
 *
 * @param {String} source
 * @return Array
 */
exports._parse = function (source) {
  source += ' ';                    // 加一个空格以便于最后判断结尾是否正确
  var length = source.length;       // 源码长度
  var curPos;                       // 当前字符位置
  var lastPos = 0;                  // 当前单词的开始位置（上一个单词结束位置）
  var lineNum = 0;                  // 当前行号
  var linePos = 0;                  // 当前行的位置
  var curToken = {line: 0, column: 0}; // 当前单词开始的位置
  var curStatus = STATUS.BLANK;     // 当前单词的状态（判断单词类型）
  var tokenList = [];                   // 已分析的单词数组（按顺序）

  // 临时状态
  var quoteBegin = false;           // 字符串开始，是单引号还是双引号
  var numberHasE = false;           // 数值是否出现e字母
  var numberHasDot = false;         // 数值是否出现点
  var numberHasSign = false;        // 数值是否出现正负符号
  var prevCharIsBackslash = false;  // 字符串内上一个字符是否为反斜杠

  // 开始新行
  var startNewLine = function () {
    lineNum++;
    linePos = 0;
  };

  // 下一个字符
  var nextChar = function (c) {
    if (c === 13) {
      // \r 换行
      startNewLine();
    } else if (c === 10) {
      var pc = source.charCodeAt(curPos - 1);
      if (pc === 13) {
        // \r\n换行，上一个已经换行了，这个忽略
      } else {
        startNewLine();
      }
    } else {
      linePos++;
    }
  };

  // 设置当前状态
  var setStatus = function (s) {
    curStatus = s;
    curToken = {
      line:    lineNum,
      column:  linePos - 1
    };
  };

  // 添加单词，末尾为当前位置的前面（不包括当前字符），可通过curPos来控制
  var pushToken = function (t) {
    if (lastPos < curPos) {
      var w = source.slice(lastPos, curPos);
      var token = {
        type:   t,
        line:   curToken.line,
        column: curToken.column,
        text:   w.trim()
      };
      if (t === TOKEN.BLANK) {
        // colum=-1，以\r或\n开头的情况
        w = w.replace(/\r|\n/img, '');
        if (token.column < 0) {
          token.column = 0;
        }
        if (w.length > 0) {
          token.text = w;
          tokenList.push(token);
        }
      } else {
        // 将字符串中的换行符转换成\n
        if (t === TOKEN.STRING) {
          token.text = token.text.replace(/\n/gm, '\\n').replace(/\r/gm, '\\r');
        }
        tokenList.push(token);
      }
    }
    lastPos = curPos;
    // 初始化临时状态
    quoteBegin = false;
    numberHasE = false;
    numberHasDot = false;
    numberHasSign = false;
    prevCharIsBackslash = false;
  };

  // 当前字符状态结束，预判断下一个字符
  var checkNextChar = function () {
    var c = source.charCodeAt(curPos);
    // 分析行号位置
    nextChar(c);
    // 重新判断字符状态
    if (isNumber(c)) {
      setStatus(STATUS.NUMBER);
    } else if (isLetter(c)) {
      setStatus(STATUS.NAME);
    } else if (isBlank(c)) {
      setStatus(STATUS.BLANK);
    } else {
      setStatus(STATUS.SYMBLE);
    }
  };

  // 分析时出错
  var throwError = function (err) {
    var err = {
      error:    'SyntaxError: ' + err,
      line:     lineNum,
      column:   linePos - 1
    };
    throw err;
  };

  try {
    for (curPos = 0; curPos < length; curPos++) {
      var s = source[curPos];
      var c = source.charCodeAt(curPos);

      // 行号位置分析
      nextChar(c);

      // 逐个分析字符
      switch (curStatus) {
        // 判断是按照以下顺序：数字 > 字母 > 空白字符 > 字符串 > 标点符号

        // 当前状态为空白字符
        case STATUS.BLANK:
          if (isNumber(c)) {
            // 数值开始
            pushToken(TOKEN.BLANK);
            setStatus(STATUS.NUMBER);
          } else if (isLetter(c)) {
            // 单词开始
            pushToken(TOKEN.BLANK);
            setStatus(STATUS.NAME);
          } else if (isQuote(c)) {
            // 字符串开始
            pushToken(TOKEN.BLANK);
            quoteBegin = c;
            setStatus(STATUS.STRING);
          } else if (isBlank(c)) {
            // 仍然是空白字符
          } else {
            // 其它符号
            pushToken(TOKEN.BLANK);
            setStatus(STATUS.SYMBLE);
          }
          break;

        // 当前状态为数值
        case STATUS.NUMBER:
          if (isNumber(c)) {
            // 仍然是数值
          } else if (isLetter(c)) {
            // 如果为第一次出现的e或E，则仍然是数值
            if (numberHasE === false && (s === 'e' || s === 'E')) {
              // 则仍然是数值
              numberHasE = true;
              numberHasSign = false;
              numberHasDot = false;
            } else {
              // 错误
              throwError('Unexpected token ' + s);
            }
          } else if (isBlank(c)) {
            // 数值结束
            pushToken(TOKEN.NUMBER);
            setStatus(STATUS.BLANK);
          } else {
            // 如果为第一次出现小数点，或者在e后第一次出现正负符号
            if (s === '.') {
              if (numberHasDot) {
                // 错误
                throwError('Unexpected token ' + s);
              } else {
                numberHasDot = true;
              }
            } else if (numberHasE && s === '+' || s === '-') {
              if (numberHasSign) {
                // 错误
                throwError('Unexpected token ' + s);
              } else {
                numberHasSign = true;
              }
            } else {
              // 数值结束
              pushToken(TOKEN.NUMBER);
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为单词
        case STATUS.NAME:
          if (isNumber(c) || isLetter(c)) {
            // 仍然是单词
          } else if (isBlank(c)) {
            // 单词结束
            pushToken(TOKEN.NAME);
            setStatus(STATUS.BLANK);
          } else {
            // 如果是下划线，则仍然是单词
            if (s === '_') {
              // 仍然是单词
            } else {
              // 单词结束
              pushToken(TOKEN.NAME);
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为符号
        case STATUS.SYMBLE:
          // 如果上一个字符是/，则有可能是注释开始，如 // 或 /*
          var pc = source.charCodeAt(curPos - 1);
          if (c === CHAR.FORWARDSLASH && pc === CHAR.FORWARDSLASH) {
            // 单行注释开始（特殊情况，不用setStatus()来设置状态）
            curStatus = STATUS.COMMENT_1;
          } else if (pc === CHAR.FORWARDSLASH && c === CHAR.STAR) {
            // 多行注释开始（特殊情况，不用setStatus()来设置状态）
            curStatus = STATUS.COMMENT_2;
          } else {
            // 将符号分割成单个字符
            pushToken(TOKEN.SYMBLE);
            if (isNumber(c)) {
              // 数值开始
              setStatus(STATUS.NUMBER);
            } else if (isLetter(c)) {
              // 单词开始
              setStatus(STATUS.NAME);
            } else if (isBlank(c)) {
              setStatus(STATUS.BLANK);
            } else if (isQuote(c)) {
              // 字符串开始
              quoteBegin = c;
              setStatus(STATUS.STRING);
            } else {
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为字符串
        case STATUS.STRING:
          // 只有遇到相同的引号才结束
          if (c === quoteBegin && prevCharIsBackslash === false) {
            // 字符串结束
            curPos++;
            pushToken(TOKEN.STRING);
            // 特殊情况，直接判断下一个字符
            checkNextChar();
          } else if (c === CHAR.BACKSLASH) {
            prevCharIsBackslash = !prevCharIsBackslash;
          } else if (prevCharIsBackslash) {
            prevCharIsBackslash = false;
            // 字符串还未结束
          }
          break;

        // 当前状态为单行注释
        case STATUS.COMMENT_1:
          // 只有遇到换行符或到达文件末尾才结束
          if (isNewLine(c) || curPos >= length - 2) {
            curPos++;
            pushToken(TOKEN.COMMENT);
            // 特殊情况，直接判断下一个字符
            checkNextChar();
          }
          break;

        // 当前状态为多行注释
        case STATUS.COMMENT_2:
          // 只有遇到 */ 才结束
          if (c === CHAR.STAR) {
            var nc = source.charCodeAt(curPos + 1);
            if (nc === CHAR.FORWARDSLASH) {
              // 已确定下一个字符为注释的末尾
              curPos += 2;
              pushToken(TOKEN.COMMENT);
              // 特殊情况，直接判断下一个字符
              nextChar();
              checkNextChar();
            }
          }
          break;

        // 未知状态
        default:
          throwError('Unexpected token ILLEGAL');
      }
    }
    if (curStatus !== STATUS.BLANK) {
      throwError('Unexpected end of input');
    } else {
      return tokenList;
    }
  } catch (err) {
    return err;
  }
};


/**
 * 分析代码，返回单词数组
 * 
 * 返回一个对象表示出错：{error: '出错信息', line: 行, column: 列}
 * 每个数组元素结构：{type: 单词类型, line: 行号, column: 当前行的位置, text: 单词}
 * 行号和位置从0开始
 *
 * @param {String} source
 * @return Array
 */
exports.parse = function (source) {
  var tokenList = exports._parse(source);
  if (!Array.isArray(tokenList)) {
    return tokenList;
  }

  // 对返回的结果进行进一步处理
  for (var i = 0; i < tokenList.length; i++) {
    (function (w, i) {
      switch (w.type) {

        case TOKEN.NAME:
          if (isKeyword(w.text)) {
            // 排除使用关键字作为标识符的情况：
            // 1、前面有小数点，如：obj.false 或者 false.name （前面或后面有小数点）
            // 2、定义对象内部的键名，如：{false: 123456} （前面肯定是"{"或","，且后面是":"）
            var prevT = tokenList[i - 1];
            var nextT = tokenList[i + 1];
            prevT = prevT && prevT.type === TOKEN.SYMBLE ? prevT.text : null;
            nextT = nextT && nextT.type === TOKEN.SYMBLE ? nextT.text : null;
            if (prevT === '.' || nextT === '.') {
              w.type = TOKEN.IDENTIFIER;
            } else if ((prevT === '{' || prevT === ',') && nextT === ':') {
              w.type = TOKEN.IDENTIFIER;
            } else {
              w.type = TOKEN.KEYWORD;
            }
          } else {
            w.type = TOKEN.IDENTIFIER;
          }
          break;

        case TOKEN.NUMBER:
          // 如果数字前面有小数点，则将其合并，必须符合以下条件
          // 1、前一个字符必须是紧邻的（没有空白字符）
          // 2、小数点的前一个字符只能是符号或者空白
          var prevT = tokenList[i - 1];
          if (prevT && prevT.type === TOKEN.SYMBLE && prevT.text === '.') {
            if (prevT.column + 1 === w.column && prevT.line === w.line) {
              var prevT2 = tokenList[i - 2];
              if (!prevT2 || prevT2.type === TOKEN.SYMBLE) {
                var newW = {
                  type:   TOKEN.NUMBER,
                  text:   prevT.text + w.text,
                  line:   prevT.line,
                  column: prevT.column
                };
                tokenList[i - 1] = newW;
                tokenList.splice(i, 1);
                i--;
              }
            }
          }
          break;

        case TOKEN.SYMBLE:
          // 合并两个符号的操作符，如：++ -- << >> == >= <= != === !==
          var nextT = tokenList[i + 1];
          if (nextT && w.line === nextT.line) {
            if ((w.text === '+' && nextT.text === '+') ||
                (w.text === '-' && nextT.text === '-') ||
                (w.text === '<' && nextT.text === '<') ||
                (w.text === '>' && nextT.text === '>') ||
                (w.text === '=' && nextT.text === '=') ||
                (w.text === '>' && nextT.text === '=') ||
                (w.text === '<' && nextT.text === '=') ||
                (w.text === '!' && nextT.text === '=')) {
                  var newW = {
                    type:   TOKEN.SYMBLE,
                    text:   w.text + nextT.text,
                    line:   w.line,
                    column: w.column
                  };
                  // 如果是 !=== 或者 ===
                  var nextT2 = tokenList[i + 2];
                  if ((w.text === '=' || w.text === '!') && nextT.text === '=' && 
                       nextT2 && nextT2.type === TOKEN.SYMBLE && nextT2.text === '=') {
                    newW.text += nextT2.text;
                    tokenList.splice(i + 1, 2);
                  } else {
                    tokenList.splice(i + 1, 1);
                  }
                  tokenList[i] = newW;
                }
          }
      }
    })(tokenList[i], i);
  }
  
  // 将 true false null undefined NaN 转化成 IDENTIFIER
  var list = ['true', 'false', 'null', 'undefined', 'NaN'];
  tokenList.forEach(function (w) {
    if (w.type === TOKEN.KEYWORD && list.indexOf(w.text) !== -1) {
      w.type = TOKEN.IDENTIFIER;
    }
  });
  
  return tokenList;
};

});

require.define("/lib/compiler/syntax.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * bright 编译器/语法分析
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var token = require('./token');

// 单词类型
var TOKEN = define.TOKEN;


var syntax = module.exports;


/**
 * 读取一行
 * 返回FALSE表示已经到底末尾
 *
 * @param {Array} tokenList
 * @return {Object}
 *   - {Array} line 当前行
 *   - {Array} next 剩下部分
 */
var readLine = function (tokenList) {
  if (tokenList[0]) {
    var lineNum = tokenList[0].line;
    for (var i = 1, len = tokenList.length; i < len; i++) {
      if (tokenList[i].line !== lineNum) {
        break;
      }
    }
    return {
      line:   tokenList.slice(0, i),
      next:   tokenList.slice(i)
    };
  } else {
    return false;
  }
};

/**
 * 抛出异常
 *
 * @param {Object} t
 * @param {String} e
 */
var throwError = function (t, e) {
  if (!e) {
    e = 'Unexpected token ' + t.text;
  }
  var err = new Error(e);
  err.error = e;
  err.token = t;
  console.error(err.stack);
  throw err;
};

/**
 * 添加一行代码
 * 如果最后一行是数组，则进入该数组，将代码添加到其末尾，一直嵌套下去
 *
 * @param {Object} context
 * @param {String} line
 */
var pushCodeLine = function (context, line) {
  // 生成缩进空格
  var spaces = getIndentSpace(context);
  context.code.push(spaces + line);
};

/**
 * 取缩进空格
 *
 * @param {Object} context
 */
var getIndentSpace = function (context) {
  var spaces = '';
  for (var i = 0; i < context.indent; i++) {
    spaces += '  ';
  }
  return spaces;
};

/**
 * 返回一个新的context
 *
 * @param {Object} context
 * @return {Object}
 */
var createNewContext = function (context) {
  var ret = {};
  for (var i in context) {
    ret[i] = context[i];
  }
  ret.defers = [];
  ret.code = [];
  return ret;
};

/**
 * 返回一个token对象
 *
 * @param {Integer} type
 * @param {Integer} line
 * @param {Integer} column
 * @param {String} text
 * @return {Object}
 */
var createNewToken = function (type, line, column, text) {
  return {type: type, line: line, column: column, text: text};
};

/**
 * 在末尾增加return语句
 *
 * @param {Array} tokenList
 * @param {Boolean} isNested
 * @return {Array}
 */
var addReturnTokenToEnd = function (tokenList, isNested) {
  var lastT = tokenList[tokenList.length - 1];
  var tReturn = createNewToken(TOKEN.KEYWORD, (lastT ? lastT.line + 1 : -1), 0, 'return');
  if (isNested) {
    tReturn.isNested = isNested;
  }
  tokenList.push(tReturn);
  return tokenList;
};

/**
 * 解析条件
 *
 * @param {Array} tokenList
 * @return {String}
 */
var parseCondition = function (tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  if (!(lastT.type === TOKEN.SYMBLE && lastT.text === '{')) {
    return throwError(lastT);
  }
  // 取出条件部分
  tokenList.pop();
  var cond = '';
  tokenList.forEach(function (t) {
    // 将等于号=转化成==
    if (t.type === TOKEN.SYMBLE && t.text === '=') {
      cond += ' == ';
    } else {
      cond += t.text;
    }
  });
  return '(' + cond + ')';
};

/**
 * 解析多个参数（赋值）
 * 用逗号分割
 * 比如：  a b[c] d.e f[g[0]]
 *          
 *
 * @param {Array} tokenList
 * @return {Object}
 *   - {Array} names 标识符数组
 *   - {Array} next 剩下的单词
 */
var parseMultiArgument = function (tokenList) {
  var names = [];
  var lastPos = 0;
  // 增加一个名称
  var push = function (i) {
    if (lastPos < i) {
      var text = '';
      var brackets = [];
      tokenList.slice(lastPos, i).forEach(function (t) {
        text += t.text;
        // 检查括号是否匹配
        if (t.type === TOKEN.SYMBLE) {
          if (t.text === '[' || t.text === '(') {
            brackets.push(t.text);
          } else if (t.text === ']' || t.text === ')') {
            var b = brackets.pop();
            if (!((t.text === ']' && b === '[') || (t.text === ')' && b === '('))) {
              return throwError(t, 'brackets do not match');
            }
          }
        }
      });
      if (brackets.length > 0) {
        return throwError(t, 'brackets do not match');
      }
      names.push(text);
      lastPos = i + 1;
    }
  };
  for (var i = 0, len = tokenList.length; i < len; i++) {
    var t = tokenList[i];
    if (t.type === TOKEN.SYMBLE) {
      if (t.text === ',') {
        push(i);
      } else if (t.text === '=') {
        push(i);
        break;
      }
    }
  }
  return {
    names:  names,
    next:   tokenList.slice(i + 1)
  };
};

/**
 * 生成多个参数代码
 *
 * @param {Array} names
 * @return {Object}
 *    - {Array} args
 *    - {Array} init
 */
var getMultiArgumentsCode = function (names) {
  var args = [];
  var init = [];
  names.forEach(function (n, i) {
    args.push('$$_arg_' + i);
    init.push(n + ' = $$_arg_' + i + ';');
  });
  return {args: args, init: init};
};

/**
 * 解析多个返回值
 * 用空格或者逗号分割
 *
 * @param {Array} tokenList
 * @return {Array}
 */
var parseMultiValue = function (tokenList) {
  var names = [];
  var lastPos = 0;
  // 增加一个名称
  var push = function (i) {
    if (lastPos < i) {
      var text = '';
      var brackets = [];
      tokenList.slice(lastPos, i).forEach(function (t) {
        text += t.text;
        // 检查括号是否匹配
        if (t.type === TOKEN.SYMBLE) {
          if (t.text === '[' || t.text === '(') {
            brackets.push(t.text);
          } else if (t.text === ']' || t.text === ')') {
            var b = brackets.pop();
            if (!((t.text === ']' && b === '[') || (t.text === ')' && b === '('))) {
              return throwError(t, 'brackets do not match');
            }
          }
        }
      });
      if (brackets.length > 0) {
        return throwError(t, 'brackets do not match');
      }
      names.push(text);
      lastPos = i + 1;
    }
  };
  for (var i = 0, len = tokenList.length; i < len; i++) {
    var t = tokenList[i];
    if (t.type === TOKEN.SYMBLE) {
      if (t.text === ',') {
        push(i);
      }
    }
  }
  push(i);
  return names;
};

/**
 * 全都空白单词
 *
 * @param {Array} tokenList
 * @return {Array}
 */
var removeBlankToken = function (tokenList) {
  var ret = [];
  tokenList.forEach(function (t) {
    if (t.type !== TOKEN.BLANK) {
      ret.push(t);
    }
  });
  return ret;
};

/**
 * 生成外围的js代码
 *
 * @param {Object} context
 * @return {String}
 */
syntax.wrap = function (context) {
  // 生成变量列表声明
  if (context.vars.length > 0) {
    var varsCode = '    var ' + context.vars.join(', ') + ';\n';
  } else {
    var varsCode = '';
  }

  // 生成延迟执行代码
  if (context.defers.length > 0) {
    var indent = '    ';
    var defersCode = ['\n' + indent + '/* defer function start */',
                      indent + 'var $$_defers = [];'];
    context.defers.forEach(function (fn) {
      defersCode.push(indent + '$$_defers.push(' + fn + ');');
    });
    defersCode.push(indent + 'var $$_oldCallback = $$_callback;');
    defersCode.push(indent + '$$_callback = $$_callback_global = function () {');
    defersCode.push(indent + '  var $$_args = arguments;');
    defersCode.push(indent + '  $$_runtime.runDefers($$_defers, $$_args[0], function (err) {');
    defersCode.push(indent + '    if (err) $$_runtime.error(err.stack);');
    defersCode.push(indent + '    $$_oldCallback.apply(null, $$_args);');
    defersCode.push(indent + '  });');
    defersCode.push(indent + '};');
    defersCode.push(indent + '/* defer function end */\n');
    defersCode = defersCode.join('\n') + '\n';
  } else {
    defersCode = '';
  }

  // 生成最终代码并返回
  var indent = getIndentSpace(context).substr(4);
  var code = '(function (' + context.args.join(', ') + ') {\n' +
    indent + '  "use strict";\n\n' +
    indent + '  /* function header start */\n' +
    indent + '  var $$_callback, $arguments;\n' +
    indent + '  if (arguments.length < 1 || typeof(arguments[arguments.length - 1]) !== "function") {\n' +
    indent + '    throw new Error("Need a callback parameter.");\n' +
    indent + '  } else {\n' +
    indent + '    $arguments = $$_runtime.parseArguments(arguments);\n' +
    indent + '    $$_callback = $arguments.callback;\n' +
    indent + '    $arguments = $arguments.arguments;\n' +
    indent + '  }\n' +
    indent + '  var $$_callback_global = $$_callback;\n' +
    indent + '  /* function header end */\n\n' +
    indent + '  try {\n' +
    (varsCode ? indent + varsCode : '') +
    (defersCode ? indent + defersCode : '') +
             context.code.join('\n') + '\n' +
    indent + '  } catch (err) {\n' +
    indent + '    return $$_callback_global(err);\n' +
    indent + '  }\n' +
    indent + '})';
    
  return code;
};

/**
 * 开始语法分析
 * 直接返回编译后的js代码
 *
 * @param {Array|Object} tokenList
 * @param {Boolean} isNested
 * @return {String}
 */
syntax.parse = function (tokenList, isNested) {
  if (isNested) {
    var context = tokenList;
  } else {
    var context = {   
      args:   [],     // 参数列表，全局
      vars:   [],     // 变量列表，全局
      defers: [],     // 延迟执行列表
      tokenList:  tokenList,  // 剩下的单词列表
      code:   [],     // 生成的js代码
      indent: 2       // 缩进
    };
  }

  // 自动在末尾增加return语句
  if (!isNested) {
    context.tokenList = addReturnTokenToEnd(context.tokenList);
  }

  // 添加行号标记
  var addLineNumber = function (t, msg) {
    pushCodeLine(context, '/* LINE:' + (t.line + 1) + ' ' + msg + ' */');
  };

  for (var ret; ret = readLine(context.tokenList);) {
    var line = removeBlankToken(ret.line);
    context.tokenList = ret.next

    // 跳过空行
    if (line.length < 1) {
      continue;
    }

    var firstT = line[0];
    var nextTs = line.slice(1);

    if (firstT.type === TOKEN.BLANK) {
      // 不处理空白字符
    } else if (firstT.type === TOKEN.KEYWORD) {
      var needNextToken = function () {
        if (nextTs.length < 1) {
          return throwError(firstT, 'Unexpected end of input');
        }
      };
      switch (firstT.text) {

        case 'argument':
          needNextToken();
          parseArgument(context, nextTs);
          break;

        case 'var':
          needNextToken();
          parseVar(context, nextTs);
          break;

        case 'let':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseLet(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'await':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseAwait(context, '', nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'sleep':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseSleep(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'function':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseFunction(context, '', nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'return':
          addLineNumber(firstT, 'START');
          parseReturn(context, nextTs, firstT.isNested);
          addLineNumber(firstT, 'END');
          break;

        case 'defer':
          needNextToken();
          parseDefer(context, nextTs);
          break;

        case 'if':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseIf(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'for':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseFor(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'break':
          addLineNumber(firstT, 'START');
          pushCodeLine(context, 'return $$_break(null);');
          addLineNumber(firstT, 'END');
          break;

        case 'continue':
          addLineNumber(firstT, 'START');
          pushCodeLine(context, 'return $$_continue(null);');
          addLineNumber(firstT, 'END');
          break;

        case 'throw':
          addLineNumber(firstT, 'START');
          parseThrow(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        case 'javascript':
          needNextToken();
          addLineNumber(firstT, 'START');
          parseJavascript(context, nextTs);
          addLineNumber(firstT, 'END');
          break;

        default:
          return throwError(firstT);
      }
    } else {
      addLineNumber(firstT, 'START');
      // 其他语句，直接返回原来的代码
      parseExpression(context, '', line);
      addLineNumber(firstT, 'END');
    }
  }

  // 返回最终的代码
  if (!isNested) {
    return syntax.wrap(context);
  }
};

/**
 * 取 { } 括号内的单词列表
 *
 * @param {Object} context
 * @return {Object}
 *  - {Array} body
 *  - {Array} next
 * @param {Boolean} isIf 是否为if语句
 */
var parseBraceBody = function (context, isIf) {
  var tokenList = context.tokenList;
  var ret;
  var body = [];
  var brace = 0;
  var containsElseElseIf = false;

  while (ret = readLine(tokenList)) {
    tokenList = ret.next;
    var line = ret.line;
    var _line = removeBlankToken(line);
    var firstT = _line[0];
    if (firstT) {
      var lastT = _line[_line.length - 1];
      if (isIf) {
        // if 语句中， } elseif { 情况，在 } 时结束
        if (firstT.type === TOKEN.SYMBLE && firstT.text === '}') {
          brace--;
        } else if (lastT.type === TOKEN.SYMBLE && lastT.text === '{') {
          brace++;
        }
      } else {
        // 非if语句中，} elseif { 情况影响花括号计数（特殊情况）
        var firstIsCloseBrace = false;
        var lastIsOpenBrace = false;
        if (firstT.type === TOKEN.SYMBLE && firstT.text === '}') {
          brace--;
          firstIsCloseBrace = true;
        }
        if (lastT.type === TOKEN.SYMBLE && lastT.text === '{') {
          brace++;
          lastIsOpenBrace = true;
        }
        if (!containsElseElseIf) {
          containsElseElseIf = firstIsCloseBrace && lastIsOpenBrace;
        }
      }
    }
    if (brace < 0) {
      // 如果末尾为这种情况：  } else {
      // 把 else { 接到剩余的单词前面
      if (_line.length > 1) {
        tokenList = _line.slice(1).concat(tokenList);
      }
      break;
    } else {
      // 保留原来可能包含空白字符的单词
      body = body.concat(line);
    }
  }

  // 特殊情况，如果是 { } 内包含了 if {} elseif {} 
  // 末尾会多了一个 }，需要去掉
  if (containsElseElseIf) {
    var lastT = body[body.length - 1];
    if (lastT && lastT.type === TOKEN.SYMBLE && lastT.text === '}') {
      body.pop();
    }
  }

  return {
    body:   body,
    next:   tokenList
  };
};

/**
 * 解析嵌套
 *
 * @param {Object} context
 * @param {Boolean} isReturn 是否在末尾增加return
 * @param {Boolean} isIf 是否为if语句
 */
var parseNested = function (context, isReturn, isIf) {
  var ret = parseBraceBody(context, isIf);
  if (isReturn) {
    ret.body = addReturnTokenToEnd(ret.body, true);
  }
  context.tokenList = ret.body;
  syntax.parse(context, true);
  context.tokenList = ret.next;
};

/**
 * 解析argument语句
 * 格式为： argument x,y,z 或者省略逗号： argument x y z
 * 输入的单词中，已经去掉了argument
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseArgument = function (context, tokenList) {
  var isComma = false;
  tokenList.forEach(function (t) {
    if (t.type === TOKEN.IDENTIFIER) {
      isComma = false;
      context.args.push(t.text);
    } else if (t.type === TOKEN.SYMBLE && t.text === ',' && !isComma) {
      isComma = true;
    } else {
      throwError(t);
    }
  });
};

/**
 * 解析var语句
 * 格式为： var x,y,z 
 * 可以同时初始化： var x=0, y=1, z=2
 * 输入的单词中，已经去掉了var
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseVar = function (context, tokenList) {
  var brackets = [];
  var isInit = false;
  var currName = null;
  var initTokens = [];
  var lastT = tokenList[tokenList.length - 1];
  tokenList.push(createNewToken(TOKEN.SYMBLE, lastT.line, lastT.column + lastT.text.length, ','));
  tokenList.forEach(function (t) {
    if (isInit) {
      if (t.type === TOKEN.SYMBLE) {
        if (t.text === '(' || t.text === '[') {
          initTokens.push(t);
          brackets.push(t);
        } else if (t.text === ')') {
          var t2 = brackets.pop();
          if (t2.text !== '(') {
            return throwError(t);
          }
          initTokens.push(t);
        } else if (t.text === ']') {
          var t2 = brackets.pop();
          if (t2.text !== '[') {
            return throwError(t);
          }
          initTokens.push(t);
        } else if (t.text === ',') {
          // 括号里面的逗号不算分隔多个变量
          if (brackets.length > 0) {
            initTokens.push(t);
          } else {
            // 初始化结束，添加初始化语句
            initTokens.push(createNewToken(TOKEN.SYMBLE, t.line, t.column, ';'));
            parseExpression(context, currName, initTokens);
            isInit = false;
          }
        } else {
          initTokens.push(t);
        }
      } else {
        initTokens.push(t);
      }
    } else {
      if (t.type === TOKEN.IDENTIFIER) {
        context.vars.push(t.text);
        currName = t.text;
        brackets = [];
        initTokens = [];
      } else if (currName && t.type === TOKEN.SYMBLE) {
        if (t.text === ',') {
          isInit = false;
        } else if (t.text === '=') {
          isInit = true;
        } else {
          return throwError(t);
        }
      } else {
        return throwError(t);
      }
    }
  });
};

/**
 * 解析let语句
 * 格式为： let name = xxx
 * 如果是await语句，支持多返回值，如 let a,b,c = await fn() 
 * 输入的单词中，已经去掉了let
 * 如果name没有在var中声明，则自动声明
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseLet = function (context, tokenList) {
  if (tokenList.length < 3) {
    return throwError(tokenList[tokenList.length - 1], 'Unexpected end of input');
  }
  
  // 分析变量名，直到遇到等于号才结束
  var ret = parseMultiArgument(tokenList);
  var names = ret.names;
  if (ret.next.length < 1) {
    return throwError(tokenList[tokenList.length - 1], 'Unexpected end of input');
  } else {
    tokenList = ret.next;
  }

  if (tokenList[0].type === TOKEN.KEYWORD) {
    if (tokenList[0].text === 'await') {
      if (!tokenList[1]) {
        return throwError(tokenList[0], 'Unexpected end of input')
      }
      parseAwait(context, names, tokenList.slice(1));
    } else if (tokenList[0].text === 'function') {
      if (!tokenList[1]) {
        return throwError(tokenList[0], 'Unexpected end of input')
      }
      if (names.length > 1) {
        return throwError(tokenList[0], 'Not support tuple assignment');
      }
      parseFunction(context, names[0], tokenList.slice(1));
    } else {
      return throwError(tokenList[0]);
    }
  } else {
    if (names.length > 1) {
      return throwError(tokenList[0], 'Not support tuple assignment');
    }
    parseExpression(context, names[0], tokenList);
  }
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
 * @param {Array} tokenList
 */
var parseExpression = function (context, name, tokenList) {
  var code = '';
  var isName = false;
  tokenList.forEach(function (t) {
    if (t.type === TOKEN.IDENTIFIER || t.type === TOKEN.KEYWORD) {
      // 相邻的关键字或标识符必须用空格隔开
      code += (isName ? ' ' : '') + t.text;
      isName = true;
    } else {
      code += t.text;
      isName = false;
    }
  });
  code = (name ? name + ' = ' : '') + code.trim();
  pushCodeLine(context, code);
};

/**
 * 解析await语句
 * 格式为： await xxx  或者 await xxx() 或者带参数 await xxx(a, b)
 * 输入的单词中，已经去掉了await
 * 或者等待一段时间：  await 1000  （单位为毫秒）
 *
 * @param {Object} context
 * @param {Array} names
 * @param {Array} tokenList
 */
var parseAwait = function (context, names, tokenList) {
  var firstT = tokenList[0];
  if (tokenList.length === 1 && firstT.type === TOKEN.NUMBER) {
    return throwError(firstT);
  } else {
    // 调用函数
    if (tokenList[0].type !== TOKEN.IDENTIFIER) {
      return throwError(tokenList[0]);
    }
    var lastT = tokenList[tokenList.length - 1];
    if (lastT.type === TOKEN.SYMBLE && lastT.text === ')') {
      // 生成 xxx(a, b, 
      var call = '';
      tokenList.slice(0, tokenList.length - 1).forEach(function (t) {
        call += t.text;
      });
      // 如果是 xxx() 则不在后面加逗号
      var lastT2 = tokenList[tokenList.length - 2];
      if (!(lastT2 && lastT2.type === TOKEN.SYMBLE && lastT2.text === '(')) {
        call += ', ';
      }
    } else {
      // 生成 xxx(
      var call = '';
      tokenList.forEach(function (t) {
        call += t.text;
      });
      call += '(';
    }
  }
  // 生成 function (arg1, arg2, ...) {
  if (names.length > 0) {
    var code = getMultiArgumentsCode(names);
  }
  call += 'function (' + (names.length > 0 ? code.args.join(', ') : '') + ') {';
  pushCodeLine(context, call);
  context.indent++;
  if (names.length > 0) {
    code.init.forEach(function (line) {
      pushCodeLine(context, line);
    });
  }
  syntax.parse(context, true);
  context.indent--;
  pushCodeLine(context, '});');
};

/**
 * 解析return语句
 * 格式为： return x 或者多个返回值 return a,b,c
 *   返回值只能是数值或者标识符，不能有其他运算符
 * 输入的单词中，已经去掉了return
 *
 * @param {Object} context
 * @param {Array} tokenList
 * @param {Boolean} isNested
 */
var parseReturn = function (context, tokenList, isNested) {
  var values = ['null'];
  if (tokenList.length > 0) {
    values = values.concat(parseMultiValue(tokenList));
  }
  pushCodeLine(context, 'return $$_callback' + (isNested ? '' : '_global') + '(' + values.join(', ') + ');');
};

/**
 * 解析defer语句
 * 格式为： defer xxx() 或者省略圆括号 defer xxx
 *    如果是多行：defer {
 *                  xx()
 *                  yy()
 *                }
 * 输入的单词中，已经去掉了defer
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseDefer = function (context, tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  var codeTop = 'function (error, $$_callback) {\n';
  var codeBottom = '\n    }';
  if (lastT.type === TOKEN.SYMBLE) {
    if (lastT.text === ')' && tokenList.length >= 3) {
      // defer xxx() 情况
      var call = '';
      tokenList.forEach(function (t) {
        call += t.text;
      });
      call = '      ' + call + ';\n      return $$_callback(null);';
      context.defers.push(codeTop + call + codeBottom);
    } else if (lastT.text === '{' && tokenList.length === 1) {
      // defer {    情况
      var newContext = createNewContext(context);
      newContext.indent = 3;
      parseNested(newContext, true);
      var code = newContext.code.join('\n');
      context.defers.push(codeTop + code + codeBottom);
      context.tokenList = newContext.tokenList;
    } else {
      return throwError(lastT);
    }
  } else if (lastT.type === TOKEN.IDENTIFIER) {
    // defer xxx 情况
    var call = '';
    tokenList.forEach(function (t) {
      call += t.text;
    });
    call = '      ' + call + '();\n      return $$_callback(null);';
    context.defers.push(codeTop + call + codeBottom);
  } else {
    return throwError(lastT);
  }
};

/**
 * 解析if语句
 * 格式为： if a+b=c {
 *            ooxx()
 *          } 
 * 输入的单词中，已经去掉了if
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseIf = function (context, tokenList) {
  // runtime.ifCondition()的参数
  var conditions = [];
  
  // 解析执行主体部分
  // TODO: 应该增加 return $$_callback(null) 到末尾
  var parseBody = function () {
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext, true, true);
    context.tokenList = newContext.tokenList;
    var code = newContext.code.join('\n');
    code = 'function ($$_callback) {\n' +
           code + '\n' +
           getIndentSpace(context) + '}';
    return code;
  }

  // 取出当前行的条件部分
  // 如 if xx {  或者 elseif xx {
  conditions.push(parseCondition(tokenList));
  conditions.push(parseBody());

  // 如果下一行是 elseif 或 else ，则继续解析
  var nextT = context.tokenList[0];
  if (nextT && nextT.type === TOKEN.KEYWORD && 
     (nextT.text === 'else' || nextT.text === 'elseif')) {
    var hasElse = false;
    for (var ret; ret = readLine(context.tokenList);) {
      var line = ret.line;
      var _line = removeBlankToken(line);
      context.tokenList = ret.next
      var firstT = _line[0];
      var nextTs = _line.slice(1);

      if (firstT.type === TOKEN.KEYWORD) {
        if (firstT.text === 'elseif') {
          conditions.push(parseCondition(nextTs));
          conditions.push(parseBody());
        } else if (firstT.text === 'else') {
          // 只能出现一次else
          if (hasElse) {
            return throwError(firstT);
          }
          conditions.push(parseBody());
          hasElse = true;
        } else {
          context.tokenList = line.concat(context.tokenList);
          break;
        }
      } else {
        context.tokenList = line.concat(context.tokenList);
        break;
      }
    }
  }
 
  // 解析后面的代码
  var newContext = createNewContext(context);
  newContext.indent++;
  parseNested(newContext, true);
  context.tokenList = newContext.tokenList;
  var nextCode = newContext.code.join('\n');

  var code = '$$_runtime.ifCondition(' + conditions.join(', ') + ', function () {\n' +
             nextCode + '\n' +
             getIndentSpace(context) + '});';
  pushCodeLine(context, code);
};

/**
 * 解析for语句
 * 格式为： for a+b=c {
 *            ooxx()
 *          } 
 * 无限循环：  for {
 *               ooxx()
 *             }
 * 遍历：   for i in obj {
 *            ooxx()
 *          }
 * 输入的单词中，已经去掉了for
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseFor = function (context, tokenList) {
  // 解析后面的代码
  var parseNext = function () {
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext);
    context.tokenList = newContext.tokenList;
    var nextCode = newContext.code.join('\n');
    return nextCode;
  }

  if (tokenList.length >= 3 && tokenList[1].type === TOKEN.KEYWORD && tokenList[1].text === 'in') {
    // 遍历
    if (tokenList[0].type !== TOKEN.IDENTIFIER) {
      return throwError(tokenList[0]);
    }
    var keyName = tokenList[0].text;
    var objName = '';
    tokenList.slice(2, tokenList.length - 1).forEach(function (t) {
      objName += t.text;
    });
    // 解析循环体
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext, true);
    context.tokenList = newContext.tokenList;
    var bodyCode = newContext.code.join('\n');
    var indent = getIndentSpace(context);
    var code = '$$_runtime.forEachLoop(' + objName + ', function (' + keyName + ', $$_continue, $$_break) {\n' +
                indent + '  var $$_callback = $$_continue;\n' +
                bodyCode + '\n' +
                indent + '}, function () {\n' +
                parseNext() + '\n' +
                indent + '});';
    pushCodeLine(context, code);
  } else {
    if (tokenList.length === 1 && tokenList[0].type === TOKEN.SYMBLE && tokenList[0].text === '{') {
      // 无条件循环
      var condition = 'true';
    } else {
      // 条件循环
      var condition = parseCondition(tokenList);
    }
    // 解析循环体
    var newContext = createNewContext(context);
    newContext.indent++;
    parseNested(newContext, true);
    context.tokenList = newContext.tokenList;
    var bodyCode = newContext.code.join('\n');
    var indent = getIndentSpace(context);
    var code = '$$_runtime.conditionLoop(function () {\n' +
                indent + '  return ' + condition + ';\n' +
                indent + '}, function ($$_continue, $$_break) {\n' +
                indent + '  var $$_callback = $$_continue;\n' +
                bodyCode + '\n' +
                indent + '}, function () {\n' +
                parseNext() + '\n' +
                indent + '});';
    pushCodeLine(context, code);
  }
};

/**
 * 解析throw语句
 * 格式为： throw 或者 throw new Error('Error')
 * 输入的单词中，已经去掉了throw
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseThrow = function (context, tokenList) {
  if (tokenList.length < 1) {
    pushCodeLine(context, 'return $$_callback_global(new Error());');
  } else {
    parseExpression(context, 'var $$_err', tokenList);
    pushCodeLine(context, 'return $$_callback_global($$_err);');
  }
};

/**
 * 解析function语句
 * 格式为： function (arg1, arg2) {
 * 或者无参数  function {
 * 输入的单词中，已经去掉了function
 *
 * @param {Object} context
 * @param {String} name 保存的变量名称，可以为空
 * @param {Array} tokenList
 */
var parseFunction = function (context, name, tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  if (!(lastT.type === TOKEN.SYMBLE && lastT.text === '{')) {
    return throwError(lastT);
  }

  // 解析参数
  var argNames = [];
  if (tokenList.length === 1) {
    // 无参数
  } else {
    var argTokens = tokenList.slice(0, tokenList.length - 1);
    var firstT = argTokens[0];
    var lastT = argTokens[argTokens.length - 1];
    if (!(firstT.type === TOKEN.SYMBLE && firstT.text === '(')) {
      return throwError(firstT);
    }
    if (!(lastT.type === TOKEN.SYMBLE && lastT.text === ')')) {
      return throwError(firstT);
    }
    var isComma = true;
    argTokens.slice(1, argTokens.length - 1).forEach(function (t) {
      if (isComma && t.type === TOKEN.IDENTIFIER) {
        argNames.push(t.text);
        isComma = false;
      } else if (!isComma && t.type === TOKEN.SYMBLE && t.text === ',') {
        isComma = true;
      } else {
        return throwError(t);
      }
    });
  }

  // 解析函数体
  var newContext = createNewContext(context);
  newContext.vars = [];
  newContext.indent += 2;
  parseNested(newContext, true);
  
  // 封装函数
  newContext.args = argNames;
  newContext.args.push('$$_callback');
  var body = syntax.wrap(newContext);
  pushCodeLine(context, '');
  var code = (name ? name + ' = ' : '') + body + ';';
  pushCodeLine(context, code);
  pushCodeLine(context, '');
  context.tokenList = newContext.tokenList;  
};

/**
 * 解析sleep语句
 * 格式为： sleep 1000  或者 sleep x*y
 * 输入的单词中，已经去掉了sleep
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseSleep = function (context, tokenList) {
  var lastT = tokenList[tokenList.length - 1];
  tokenList.push(createNewToken(TOKEN.SYMBLE, lastT.line, lastT.column + lastT.text.length + 1, ';'));
  parseExpression(context, 'var $$_sleep_ms', tokenList);
  var code = '$$_runtime.sleep($$_sleep_ms, function ($$_err) {';
  pushCodeLine(context, code);
  context.indent++;
  syntax.parse(context, true);
  context.indent--;
  pushCodeLine(context, '});');
};

/**
 * 解析javascript语句
 * 格式为： javascript {
 * 输入的单词中，已经去掉了javascript
 *
 * @param {Object} context
 * @param {Array} tokenList
 */
var parseJavascript = function (context, tokenList) {
  var firstT = tokenList[0];
  if (!(tokenList.length === 1 && firstT.type === TOKEN.SYMBLE && firstT.text === '{')) {
    return throwError(firstT);
  }
  var ret = parseBraceBody(context);
  var tokenList = ret.body;
  var line;
  while (line = readLine(tokenList)) {
    tokenList = line.next;
    var isName = false;
    var code = '';
    line.line.forEach(function (t) {
      if (t.type === TOKEN.IDENTIFIER || t.type === TOKEN.KEYWORD) {
        // 相邻的关键字或标识符必须用空格隔开
        code += (isName ? ' ' : '') + t.text;
        isName = true;
      } else {
        code += t.text;
        isName = false;
      }
    });
    pushCodeLine(context, code);
  }

  context.tokenList = ret.next;
};

});

require.define("/index.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * bright
 *
 * @author 老雷<leizongmin@gmail.com>
 */


module.exports = require('./lib');
});
require("/index.js");
})();
