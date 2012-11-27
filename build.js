/**
 * bright 生成用于浏览器的文件
 *
 * @author 老雷<leizongmin@gmail.com>
 */


var path = require('path');
var fs = require('fs');
var browserify = require('browserify');
var UglifyJS = require('uglify-js');


process.chdir(__dirname);

// JIT编译器
// 打包文件
console.log('create file: ./build/bright.js');
var b = browserify();
b.addEntry('./index.js');
fs.writeFileSync('./build/bright.js', b.bundle());
// 压缩文件
console.log('create file: ./build/bright.min.js');
var result = UglifyJS.minify(['./build/bright.js']);
fs.writeFileSync('./build/bright.min.js', result.code);

// 运行时库
console.log('create file: ./build/bright.runtime.js');
var rtContent = fs.readFileSync('./lib/runtime/core.js', 'utf8');
rtContent = '(function () {\n' +
            '  if (typeof(window.Bright) === "undefined") {\n' +
            '    window.Bright = {};\n' +
            '  }\n' +
            '  var module = {exports: {}};\n' +
            '  (function (module, exports) {\n' +
            rtContent + '\n' +
            '  })(module, module.exports);\n' +
            '  window.Bright.runtime = module.exports;\n' +
            '})();';
fs.writeFileSync('./build/bright.runtime.js', rtContent);
// 压缩文件
console.log('create file: ./build/bright.runtime.min.js');
var result = UglifyJS.minify(['./build/bright.runtime.js']);
fs.writeFileSync('./build/bright.runtime.min.js', result.code);

// 生成测试文件
process.argv = process.argv.slice(0, 2).concat(['-i', './build/test', '-o', './build/test']);
require('./bin/bright');
