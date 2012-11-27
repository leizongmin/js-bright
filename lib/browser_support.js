/**
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
