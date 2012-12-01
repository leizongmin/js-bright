/**
 * 运行时库 核心
 */


var should = require('should');
var runtime = require('../lib/runtime/core');


describe('runtime/core', function () {
  
  describe('ifCondition', function () {
    it('runDefers', function (done) {
      var defers = [];
      var sum = 0;
      // 普通
      defers.push(function (error, callback) {
        error.should.equal('error info');
        sum++;
        callback(null);
      });
      // 出错
      defers.push(function (error, callback) {  
        error.should.equal('error info');
        throw new Error();
      });
      // 异步
      defers.push(function (error, callback) {
        error.should.equal('error info');
        process.nextTick(function () {
          sum++;
          callback();
        });
      });
      runtime.runDefers(defers, 'error info', function () {
        sum.should.equal(2);
        done();
      });
    });
  });

  describe('ifCondition', function () {
    
    it('if ...', function (done) {
      var isOk = false;
      runtime.ifCondition(true, function (callback) {
        isOk = !isOk;
        callback();
      }, function () {
        isOk.should.equal(true);

        runtime.ifCondition(false, function (callback) {
          throw new Error('条件不满足，不应该执行');
        }, function () {
          isOk.should.equal(true);
          done();
        });
      });
    });
    
    it('if ... else', function (done) {
      var isOk = false;
      runtime.ifCondition(true, function (callback) {
        isOk = !isOk;
        callback();
      }, function () {
        throw new Error('条件不满足，不应该执行');
      }, function () {
        isOk.should.equal(true);
        
        runtime.ifCondition(false, function () {
          throw new Error('条件不满足，不应该执行');
        }, function (callback) {
          isOk = !isOk;
          callback();
        }, function () {
          isOk.should.equal(false);
          done();
        });
      });
    });

    it('if ... elseif ... elseif ...', function (done) {
      var isOk = false;
      runtime.ifCondition(false, function () {
        throw new Error('条件不满足，不应该执行');
      }, false, function () {
        throw new Error('条件不满足，不应该执行');
      }, false, function () {
        throw new Error('条件不满足，不应该执行');
      }, true, function (callback) {
        isOk = !isOk;
        callback();
      }, function () {
        isOk.should.equal(true);
        done();
      });
    });
    
    it('if ... elseif ... elseif ... else', function (done) {
      var isOk = false;
      runtime.ifCondition(false, function () {
        throw new Error('条件不满足，不应该执行');
      }, false, function () {
        throw new Error('条件不满足，不应该执行');
      }, false, function () {
        throw new Error('条件不满足，不应该执行');
      }, false, function () {
        throw new Error('条件不满足，不应该执行');
      }, function (callback) {
        isOk = !isOk;
        callback();
      }, function () {
        isOk.should.equal(true);
        done();
      });
    });

  });

  describe('conditionLoop', function () {
    it('正常循环', function (done) {
      // 相当于  for (var i = 0; i < 10; i++) { }
      var i = 0;
      runtime.conditionLoop(function () {
        return i < 10;
      }, function (_continue) {
        i++;
        _continue();
      }, function () {
        i.should.equal(10);
        done();
      });
    });
    it('break', function (done) {
      // 相当于  for (var i = 0; i < 10; i++) { if (i >= 5) break; }
      var i = 0;
      runtime.conditionLoop(function () {
        return i < 10;
      }, function (_continue, _break) {
        i++;
        if (i >= 5) return _break();
        _continue();
      }, function () {
        i.should.equal(5);
        done();
      });
    });
  });

  describe('forEachLoop', function () {
    it('正常循环', function (done) {
      // 相当于 for (var i in obj) { }
      var obj = {};
      obj.ssr = 15452;
      obj.sf = 'jfdjglkdf';
      obj.rtdds = 'fdfd';
      obj[0] = 55145;
      obj[34] = false;
      var obj2 = {};
      runtime.forEachLoop(obj, function (i, _continue) {
        obj2[i] = obj[i];
        _continue();
      }, function () {
        obj2.should.eql(obj);
        done();
      });
    });
    it('break', function (done) {
      // 相当于 for (var i in obj) { }
      var obj = {};
      obj.ssr = 15452;
      obj.sf = 'jfdjglkdf';
      obj.rtdds = 'fdfd';
      obj[0] = 55145;
      obj[34] = false;
      var obj2 = {};
      runtime.forEachLoop(obj, function (i, _continue, _break) {
        obj2[i] = obj[i];
        return _break();
      }, function () {
        Object.keys(obj2).length.should.equal(1);
        done();
      });
    });
  });

  it('sleep', function (done) {
    runtime.sleep(100, function () {
      done();
    });
  });

  it('parseArguments', function () {
    runtime.parseArguments([1,2,3,4]).should.eql({
      arguments: [1,2,3],
      callback:  4
    });
  });

});