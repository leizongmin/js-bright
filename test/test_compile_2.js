/**
 * 测试编译2
 */


var path = require('path');
var fs = require('fs');
var should = require('should');
var compiler = require('../');


describe('compile 2', function () {

  var compile = function (filename) {
    filename = path.resolve(__dirname, 'bright_files', filename + '.bright');
    var source = fs.readFileSync(filename, 'utf8');
    return compiler.compile(source);
  };
  
  it('#1 嵌套for / if', function (done) {
    var fn = compile('1');
    fn(function (err, sum, i, j, k) {
      should.equal(err, null);
      sum.should.equal(12);
      i.should.equal(2);
      j.should.equal(3);
      k.should.equal(4);
      done();
    });
  });

  it('#2 内嵌javascript', function (done) {
    var fn = compile('2');
    fn(function (err, ret) {
      should.equal(err, null);
      ret.should.eql([1,3,5,7,9]);
      done();
    });
  });

  it('#3 内嵌多个function', function (done) {
    var fn = compile('3');
    fn(function (err, ret1, ret2) {
      should.equal(err, null);
      ret1.should.equal(7);
      ret2.should.equal(12);
      done();
    });
  });
  
  it('#4 function里面的if elseif', function (done) {
    var fn = compile('4');
    fn(function (err, ret) {
      should.equal(err, null);
      ret.should.equal(-1);
      done();
    })
  });
  
  it('#5 多个if elseif', function (done) {
    var fn = compile('5');
    fn(3, 4, function (err, ret) {
      should.equal(err, null);
      ret.should.equal(-1);
      fn(5, 5, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(0);
        done();
      })  
    })
  });
  
  it('#6 for in 里面的 if elseif', function (done) {
    var fn = compile('6');
    fn(function (err, ret1, ret2, ret3) {
      should.equal(err, null);
      ret1.should.eql([2,4,6,8,10]);
      ret2.should.eql([3,9]);
      ret3.should.eql([1,5,7]);
      done();
    });
  });

  it('#7 var中包含赋值语句时，在其所在的位置赋值', function (done) {
    var fn = compile('7');
    fn(true, function (err, ret1, ret2) {
      should.equal(err, null);
      ret1.should.equal(123);
      ret2.should.equal(90);
      fn(false, function (err, ret1, ret2) {
        should.equal(err, null);
        ret1.should.equal(456);
        ret2.should.equal(78);
        done();
      });
    });
  });
  
});