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

});