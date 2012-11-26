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
  
  describe('argument & return', function () {
    it('单个参数及返回值', function (done) {
      var fn = compile('argument v\nreturn v');
      fn(1234, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(1234);
        done();
      });
    });
    it('多个参数及返回值', function (done) {
      var fn = compile('argument a b c\nreturn c, b, a');
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
      var fn = compile('var a\nlet a = 13800138\nreturn a');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.equal(13800138);
        done();
      });
    });
    it('普通赋值 2', function (done) {
      var fn = compile('var a\nlet a = "haha\nwawa"\nreturn a');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.equal('haha\nwawa');
        done();
      });
    });
    it('属性赋值 1', function (done) {
      var fn = compile('var a\nlet a = {}\nlet a.data = "haha\nwawa"\nreturn a');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.data.should.equal('haha\nwawa');
        done();
      });
    });
  });
  
  describe('var & strict mode', function () {
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
      var fn = compile('argument async\nvar a, err\nlet err, a = await async\nreturn a');
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
      var fn = compile('argument async\nvar a, b, c, err\nlet err,a,b,c = await async\nreturn a,b,c');
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
      var fn = compile('argument async\nvar a b c err\nlet err,a,b,c = await async(1,2,3)\nreturn a,b,c');
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
  
  describe('if ... elseif ... else', function () {
    it('if', function (done) {
      var fn = compile('if 2 > 1 {\nreturn true\n}\nreturn false');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.equal(true);

        var fn = compile('if 1 > 2 {\nreturn true\n}\nreturn false');
        fn(function (err, ret) {
          should.equal(err, null);
          ret.should.equal(false);
          done();
        })
      });
    });
    it('if ... else', function (done) {
      var fn = compile('if 1 + 1 = 2 {\nreturn true\n} else {\nreturn false\n}\nreturn 1234');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.equal(true);
        ret.should.not.equal(1234);
        
        var fn = compile('if 2 + 2 = 1 {\nreturn true\n} else {\nreturn false\n}\nreturn 1234');
        fn(function (err, ret) {
          should.equal(err, null);
          ret.should.equal(false);
          ret.should.not.equal(1234);
          done();
        });
      });
    });
    it('if ... elseif ... else', function (done) {
      var fn = compile('if false {\nreturn 1\n} elseif true {\nreturn 2\n}\nreturn 3');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.equal(2);

        var fn = compile('if false {\nreturn 1\n} elseif false {\nreturn 2\n}\nreturn 3');
        fn(function (err, ret) {
          should.equal(err, null);
          ret.should.equal(3);
          
          var fn = compile('if false {\nreturn 1\n} elseif false {\nreturn 2\n} else {\nreturn 3\n}\nreturn 4');
          fn(function (err, ret) {
            should.equal(err, null);
            ret.should.equal(3);
            done();
          });
        });
      });
    });
  });
  
  describe('for', function () {
    it('普通条件循环', function (done) {
      var fn = compile('var a i\nlet a = ""\nlet i = 0\nfor i < 10 {\nlet a = a + "A"\nlet i = i + 1\n}\nreturn a, i');
      fn(function (err, a, i) {
        should.equal(err, null);
        a.should.equal('AAAAAAAAAA');
        i.should.equal(10);
        done();
      });
    });
    it('无条件循环 & break', function (done) {
      var fn = compile('var a i\nlet a = ""\nlet i = 0\nfor i < 10 {\nif i >= 5 {\nbreak\n}\nlet a = a + "A"\nlet i = i + 1\n}\nreturn a, i');
      fn(function (err, a, i) {
        should.equal(err, null);
        a.should.equal('AAAAA');
        i.should.equal(5);
        done();
      });
    });
    it('无条件循环 & continue', function (done) {
      var fn = compile('var a i\nlet a = ""\nlet i = 0\nfor i < 10 {\nlet i = i + 1\nif i > 5 {\ncontinue\n}\nlet a = a + "A"\n}\nreturn a, i');
      fn(function (err, a, i) {
        should.equal(err, null);
        a.should.equal('AAAAA');
        i.should.equal(10);
        done();
      });
    });
    it('遍历对象', function (done) {
      var data = {a: Math.random(), b: Math.random(), c: Date.now()};
      var fn = compile('var ret\nargument data\nlet ret = {}\nfor i in data {\nret[i] = data[i]\n}\nreturn ret');  
      fn(data, function (err, ret) {
        should.equal(err, null);
        ret.should.eql(data);
        done();
      });
    });
    it('遍历数组', function (done) {
      var data = [Math.random(), Math.random(), Date.now()];
      var fn = compile('var ret\nargument data\nlet ret = {}\nfor i in data {\nret[i] = data[i]\n}\nreturn ret');  
      fn(data, function (err, ret) {
        should.equal(err, null);
        ret.should.eql(data);
        done();
      });
    });
  });

  describe('内嵌JavaScript代码', function () {
    it('定义对象', function (done) {
      var fn = compile('var a\na = {\na:123,\nb:456,\nc:"cc\nd"\n};\nreturn a');
      fn(function (err, ret) {
        should.equal(err, null);
        ret.should.eql({
          a:  123,
          b:  456,
          c:  'cc\nd'
        });
        done();
      });
    });
    it('其他表达式', function (done) {
      var fn = compile('argument x\nvar a\na = x > 10 ? 123 : 456;\nreturn a');
      fn(101, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(123);

        fn(5, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(456);
          done();
        });
      });
    });
  });

  describe('动态参数，遍历$argument变量', function () {
    it('一般', function (done) {
      var fn = compile('var ret\nret = []\nfor i in $arguments {\nret.push($arguments[i])\n}\nreturn ret');
      fn(123, 456, 789, function (err, ret) {
        should.equal(err, null);
        ret.should.eql([123, 456, 789]);
        done();
      });
    });
  });

  describe('throw', function () {
    it('空出错信息', function (done) {
      var fn = compile('throw');
      fn(function (err) {
        err.should.instanceof(Error);
        done();
      });
    });
    it('自定义出错信息 #1', function (done) {
      var fn = compile('throw 123');
      fn(function (err) {
        err.should.equal(123);
        done();
      });
    });
    it('自定义出错信息 #2', function (done) {
      var fn = compile('throw new Error("error message")');
      fn(function (err) {
        err.should.instanceof(Error);
        /error message/g.test(err.toString()).should.equal(true);
        done();
      });
    });
  });

  describe('function', function () {
    it('定义函数', function (done) {
      var fn = compile('argument x\nvar fn,ret,err\nlet fn = function (y) {\nreturn y * y\n}\nlet err,ret = await fn(x)\nreturn ret');
      fn(10, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(100);
        fn(2, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(4);
          done();
        });
      });
    });
    it('嵌套定义函数', function (done) {
      var code = [
        'argument x',
        'var fn, ret, err',
        'let fn = function (y) {',
        '  var err, ret, fn2',
        '  let fn2 = function (y2) {',
        '    return y2 * y2',
        '  }',
        '  let err, ret = await fn2(y)',
        '  if err {',
        '    throw err',
        '  }',
        '  return y * ret',
        '}',
        'let err, ret = await fn(x)',
        'if err {',
        '  throw err',
        '}',
        'return ret'
      ].join('\n');
      var fn = compile(code);
      fn(2, function (err, ret) {
        should.equal(err, null);
        ret.should.equal(8);
        fn(10, function (err, ret) {
          should.equal(err, null);
          ret.should.equal(1000);
          done();
        });
      });
    });
  });

  describe('sleep', function () {
    it('等待一段时间 常量', function (done) {
      var fn = compile('sleep 200');
      var start = Date.now();
      fn(function (err) {
        var end = Date.now();
        should.equal(err, null);
        should.equal(end - start > 200 * 0.8, true);
        done();
      });
    });
    it('等待一段时间 变量', function (done) {
      var fn = compile('argument n\nsleep n * 2');
      var start = Date.now();
      fn(50, function (err) {
        var end = Date.now();
        should.equal(err, null);
        should.equal(end - start > 50 * 2 * 0.8, true);
        done();
      });
    });
  });

});