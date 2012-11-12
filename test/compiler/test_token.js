/**
 * 词法分析器 单元测试
 */


var should = require('should');
var token = require('../../lib/compiler/token');
var define = require('../../lib/compiler/define');


describe('compiler/token', function () {

  var parse = token.parse;
  var WORD = define.WORD;
  var testEql = function (str, obj) {
    return parse(str).should.eql(obj);
  };

  it('正常数字', function () {
    testEql('123', [{type: WORD.NUMBER, line: 0, column: 0, word: '123'}]);
    testEql('123.456', [{type: WORD.NUMBER, line: 0, column: 0, word: '123.456'}]);
    testEql('123e123', [{type: WORD.NUMBER, line: 0, column: 0, word: '123e123'}]);
    testEql('123e123.456', [{type: WORD.NUMBER, line: 0, column: 0, word: '123e123.456'}]);
    testEql('123E123', [{type: WORD.NUMBER, line: 0, column: 0, word: '123E123'}]);
    testEql('123.E123', [{type: WORD.NUMBER, line: 0, column: 0, word: '123.E123'}]);
    testEql('123e+123', [{type: WORD.NUMBER, line: 0, column: 0, word: '123e+123'}]);
    testEql('123e-123', [{type: WORD.NUMBER, line: 0, column: 0, word: '123e-123'}]);
    testEql('123.456e123', [{type: WORD.NUMBER, line: 0, column: 0, word: '123.456e123'}]);
    testEql('123.456e123.456', [{type: WORD.NUMBER, line: 0, column: 0, word: '123.456e123.456'}]);
    testEql('123.456e-123.456', [{type: WORD.NUMBER, line: 0, column: 0, word: '123.456e-123.456'}]);
  });

  it('异常数字', function () {
    testEql('123ee123', {error: 'SyntaxError: Unexpected token e', line: 0, column: 4});
    testEql('123.456.789', {error: 'SyntaxError: Unexpected token .', line: 0, column: 7});
    testEql('127.e++', {error: 'SyntaxError: Unexpected token +', line: 0, column: 6});
    testEql('127.e+-', {error: 'SyntaxError: Unexpected token -', line: 0, column: 6});
    testEql('127.e+e+', {error: 'SyntaxError: Unexpected token e', line: 0, column: 6});
    testEql('127.e+0.5.5', {error: 'SyntaxError: Unexpected token .', line: 0, column: 9});
  });

  it('正常字符串', function () {
    testEql('"hello=jkfjkfs"', [{type: WORD.STRING, line: 0, column: 0, word: 'hello=jkfjkfs'}]);
    testEql('"hello=\nd\njkfjkfs"', [{type: WORD.STRING, line: 0, column: 0, word: 'hello=\nd\njkfjkfs'}]);
    testEql('"hello=\\\"jkfjkfs"', [{type: WORD.STRING, line: 0, column: 0, word: 'hello=\\\"jkfjkfs'}]);
  });

  it('异常字符串', function () {
    testEql('"fdkkkfd', {error: 'SyntaxError: Unexpected end of input', line: 0, column: 8});
  });

});