/**
 * 测试编译
 */


var should = require('should');
var compiler = require('../');


var line = function () {
  console.log('------------------------------------------------------------');
};


describe('compile', function () {

  var compile = function (source) {
    return compiler.compile(source);
  };
  
  describe('argument / return', function () {
    it('单个参数及返回值', function (done) {
      var fn = compile('argument v\nreturn v');
      fn(1234, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(1234);
        done();
      });
    });
    it('多个参数及返回值', function (done) {
      var fn = compile('argument a b c\nreturn c b a');
      fn(123, 456, 789, function (err, a, b, c) {
        should.equal(err, null);
        a.should.equal(789);
        b.should.equal(456);
        c.should.equal(123);
        done();
      });
    });
    it('多个参数及返回值（用逗号分隔）', function (done) {
      var fn = compile('argument a, b, c\nreturn c, b, a');
      fn(123, 456, 789, function (err, a, b, c) {
        should.equal(err, null);
        a.should.equal(789);
        b.should.equal(456);
        c.should.equal(123);
        done();
      });
    });
  });

  describe('let', function () {
    it('普通赋值 1', function (done) {
      var fn = compile('let a = 13800138\nreturn a');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.equal(13800138);
        done();
      });
    });
    it('普通赋值 2', function (done) {
      var fn = compile('let a = "haha\nwawa"\nreturn a');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.equal('haha\nwawa');
        done();
      });
    });
  });

  describe('var / strict mode', function () {
    it('未声明变量，抛出异常', function (done) {
      var fn = compile('return a');
      fn(function (err) {
        should.notEqual(err, null);
        console.log(err.stack);
        done();
      });
    });
    it('声明变量', function (done) {
      var fn = compile('var a\nreturn a');
      fn(function (err, ret) {
        should.equal(err, null);
        should.equal(ret, undefined);
        done();
      });
    });
  });

  describe('await', function () {
    it('等待异步调用（无返回值，不带括号）', function (done) {
      var async = function (callback) {
        process.nextTick(function () {
          callback(null);
        });
      };
      var fn = compile('argument async\nawait async');
      fn(async, function (err) {
        should.equal(err, null);
        done();
      });
    });
    it('等待异步调用（无返回值，有括号）', function (done) {
      var async = function (callback) {
        process.nextTick(function () {
          callback(null);
        });
      };
      var fn = compile('argument async\nawait async()');
      fn(async, function (err) {
        should.equal(err, null);
        done();
      });
    });

    it('等待异步调用（有返回值）', function (done) {
      var async = function (callback) {
        process.nextTick(function () {
          callback(null, 8787);
        });
      };
      var fn = compile('argument async\nlet a = await async\nreturn a');
      fn(async, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(8787);
        done();
      });
    });
    it('等待异步调用（多个返回值）', function (done) {
      var async = function (callback) {
        process.nextTick(function () {
          callback(null, 8, 7, 9);
        });
      };
      var fn = compile('argument async\nlet a b c = await async\nreturn a b c');
      fn(async, function (err, a, b, c) {
        should.equal(err, null);
        a.should.equal(8);
        b.should.equal(7);
        c.should.equal(9);
        done();
      });
    });
    it('等待异步调用（多个返回值，用逗号分隔）', function (done) {
      var async = function (callback) {
        process.nextTick(function () {
          callback(null, 8, 7, 9);
        });
      };
      var fn = compile('argument async\nlet a,b, c = await async\nreturn a b c');
      fn(async, function (err, a, b, c) {
        should.equal(err, null);
        a.should.equal(8);
        b.should.equal(7);
        c.should.equal(9);
        done();
      });
    });
    it('等待异步调用（用参数）', function (done) {
      var async = function (a, b, c, callback) {
        process.nextTick(function () {
          callback(null, c, b, a);
        });
      };
      var fn = compile('argument async\nlet a,b,c = await async(1,2,3)\nreturn a,b,c');
      fn(async, function (err, a, b, c) {
        should.equal(err, null);
        a.should.equal(3);
        b.should.equal(2);
        c.should.equal(1);
        done();
      });
    });
  });

  describe('defer', function () {
    it('单行函数调用', function (done) {
      var hasCall = false;
      var call = function () {
        hasCall = true;
      };
      var fn = compile('argument call\ndefer call\nreturn 123');
      fn(call, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(123);
        hasCall.should.equal(true);
        done();
      });
    });
    it('单行函数调用（带括号）', function (done) {
      var hasCall = false;
      var call = function () {
        hasCall = true;
      };
      var fn = compile('argument call\ndefer call()\nreturn 123');
      fn(call, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(123);
        hasCall.should.equal(true);
        done();
      });
    });
    it('单行函数调用（带参数）', function (done) {
      var hasCall = false;
      var call = function (isOk) {
        hasCall = isOk;
      };
      var fn = compile('argument call\ndefer call(true)\nreturn 123');
      fn(call, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(123);
        hasCall.should.equal(true);
        done();
      });
    });
    it('多行语句', function (done) {
      done();
    });
  });

});