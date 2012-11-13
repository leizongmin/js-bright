/**
 * 词法分析器 单元测试
 */


var should = require('should');
var token = require('../../lib/compiler/token');
var define = require('../../lib/compiler/define');


var line = function () {
  console.log('------------------------------------------------------------');
};


describe('compiler/token', function () {

  describe('_parse() 原始分词', function () {
    var parse = token._parse;
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
      testEql('"hello=jkfjkfs"', [{type: WORD.STRING, line: 0, column: 0, word: '"hello=jkfjkfs"'}]);
      testEql('"hello=\nd\njkfjkfs"', [{type: WORD.STRING, line: 0, column: 0, word: '"hello=\nd\njkfjkfs"'}]);
      testEql('"hello=\\\"jkfjkfs"', [{type: WORD.STRING, line: 0, column: 0, word: '"hello=\\\"jkfjkfs"'}]);
      testEql('"abc\\"\'\r\n\t\\""', [{type: WORD.STRING, line: 0, column: 0, word: '"abc\\"\'\r\n\t\\""'}]);
    });

    it('异常字符串', function () {
      testEql('"fdkkkfd', {error: 'SyntaxError: Unexpected end of input', line: 0, column: 8});
    });

    it('符号', function () {
      testEql('+-*/', [{type: WORD.SYMBLE, line: 0, column: 0, word: '+'},
                       {type: WORD.SYMBLE, line: 0, column: 1, word: '-'},
                       {type: WORD.SYMBLE, line: 0, column: 2, word: '*'},
                       {type: WORD.SYMBLE, line: 0, column: 3, word: '/'}]);
    });

    it('正常单词', function () {
      testEql('hello', [{type: WORD.WORD, line: 0, column: 0, word: 'hello'}]);
      testEql('hello34', [{type: WORD.WORD, line: 0, column: 0, word: 'hello34'}]);
      testEql('hello_s', [{type: WORD.WORD, line: 0, column: 0, word: 'hello_s'}]);
      testEql('_hello', [{type: WORD.WORD, line: 0, column: 0, word: '_hello'}]);
      testEql('$', [{type: WORD.WORD, line: 0, column: 0, word: '$'}]);
      testEql('_', [{type: WORD.WORD, line: 0, column: 0, word: '_'}]);
      testEql('$$_f', [{type: WORD.WORD, line: 0, column: 0, word: '$$_f'}]);
    });

    it('异常单词', function () {
      testEql('0abcd', {error: 'SyntaxError: Unexpected token a', line: 0, column: 1});
    });

    it('单行注释', function () {
      testEql('//abcd', [{type: WORD.COMMENT, line: 0, column: 0, word: '//abcd'}]);
      testEql('//abcd//sss', [{type: WORD.COMMENT, line: 0, column: 0, word: '//abcd//sss'}]);
      testEql('//abc\nabc', [{type: WORD.COMMENT, line: 0, column: 0, word: '//abc'},
                             {type: WORD.WORD, line: 1, column: 0, word: 'abc'}]);
    });

    it('多行注释', function () {
      testEql('/*hello*/', [{type: WORD.COMMENT, line: 0, column: 0, word: '/*hello*/'}]);
      testEql('/*how*//*are*//*you*/', [{type: WORD.COMMENT, line: 0, column: 0, word: '/*how*/'},
                                        {type: WORD.COMMENT, line: 0, column: 7, word: '/*are*/'},
                                        {type: WORD.COMMENT, line: 0, column: 14, word: '/*you*/'}]);
    });

    it('单行综合测试', function () {
      testEql('if a + b = 10', [{type: WORD.WORD, line: 0, column: 0, word: 'if'},
                                {type: WORD.WORD, line: 0, column: 3, word: 'a'},
                                {type: WORD.SYMBLE, line: 0, column: 5, word: '+'},
                                {type: WORD.WORD, line: 0, column: 7, word: 'b'},
                                {type: WORD.SYMBLE, line: 0, column: 9, word: '='},
                                {type: WORD.NUMBER, line: 0, column: 11, word: '10'},]);
      testEql('if a+b=10', [{type: WORD.WORD, line: 0, column: 0, word: 'if'},
                            {type: WORD.WORD, line: 0, column: 3, word: 'a'},
                            {type: WORD.SYMBLE, line: 0, column: 4, word: '+'},
                            {type: WORD.WORD, line: 0, column: 5, word: 'b'},
                            {type: WORD.SYMBLE, line: 0, column: 6, word: '='},
                            {type: WORD.NUMBER, line: 0, column: 7, word: '10'},]);
      testEql('"abc" + 50 = "abc50"', [{type: WORD.STRING, line: 0, column: 0, word: '"abc"'},
                                       {type: WORD.SYMBLE, line: 0, column: 6, word: '+'},
                                       {type: WORD.NUMBER, line: 0, column: 8, word: '50'},
                                       {type: WORD.SYMBLE, line: 0, column: 11, word: '='},
                                       {type: WORD.STRING, line: 0, column: 13, word: '"abc50"'}]);
      testEql('"abc"+50="abc50"', [{type: WORD.STRING, line: 0, column: 0, word: '"abc"'},
                                    {type: WORD.SYMBLE, line: 0, column: 5, word: '+'},
                                    {type: WORD.NUMBER, line: 0, column: 6, word: '50'},
                                    {type: WORD.SYMBLE, line: 0, column: 8, word: '='},
                                    {type: WORD.STRING, line: 0, column: 9, word: '"abc50"'}]);
      //testEql('abc;//abc', [{type: WORD.WORD, }])
    });

    it('多行综合测试', function () {
      testEql('if (a+10="123") {\n\tok()\n} else {\n\texit\n}', [{type: WORD.WORD, line: 0, column: 0, word: 'if'},
                                                                 {type: WORD.SYMBLE, line: 0, column: 3, word: '('},
                                                                 {type: WORD.WORD, line: 0, column: 4, word: 'a'},
                                                                 {type: WORD.SYMBLE, line: 0, column: 5, word: '+'},
                                                                 {type: WORD.NUMBER, line: 0, column: 6, word: '10'},
                                                                 {type: WORD.SYMBLE, line: 0, column: 8, word: '='},
                                                                 {type: WORD.STRING, line: 0, column: 9, word: '"123"'},
                                                                 {type: WORD.SYMBLE, line: 0, column: 14, word: ')'},
                                                                 {type: WORD.SYMBLE, line: 0, column: 16, word: '{'},
                                                                 {type: WORD.WORD, line: 1, column: 1, word: 'ok'},
                                                                 {type: WORD.SYMBLE, line: 1, column: 3, word: '('},
                                                                 {type: WORD.SYMBLE, line: 1, column: 4, word: ')'},
                                                                 {type: WORD.SYMBLE, line: 2, column: 0, word: '}'},
                                                                 {type: WORD.WORD, line: 2, column: 2, word: 'else'},
                                                                 {type: WORD.SYMBLE, line: 2, column: 7, word: '{'},
                                                                 {type: WORD.WORD, line: 3, column: 1, word: 'exit'},
                                                                 {type: WORD.SYMBLE, line: 4, column: 0, word: '}'},]);
    });
  });

  
  describe('parse() 最终输出', function () {
    var parse = token.parse;
    var WORD = define.WORD;
    var testEql = function (str, obj) {
      return parse(str).should.eql(obj);
    };

    it('关键词处理 - 正常情况', function () {
      testEql('false', [{type: WORD.KEYWORD, line: 0, column: 0, word: 'false'}]);
      testEql('false.true', [{type: WORD.IDENTIFIER, line: 0, column: 0, word: 'false'},
                             {type: WORD.SYMBLE, line: 0, column: 5, word: '.'},
                             {type: WORD.IDENTIFIER, line: 0, column: 6, word: 'true'}]);
      testEql('{false:true}', [{type: WORD.SYMBLE, line: 0, column: 0, word: '{'},
                               {type: WORD.IDENTIFIER, line: 0, column: 1, word: 'false'},
                               {type: WORD.SYMBLE, line: 0, column: 6, word: ':'},
                               {type: WORD.KEYWORD, line: 0, column: 7, word: 'true'},
                               {type: WORD.SYMBLE, line: 0, column: 11, word: '}'}]);
      testEql('false?true:false', [{type: WORD.KEYWORD, line: 0, column: 0, word: 'false'},
                                  {type: WORD.SYMBLE, line: 0, column: 5, word: '?'},
                                  {type: WORD.KEYWORD, line: 0, column: 6, word: 'true'},
                                  {type: WORD.SYMBLE, line: 0, column: 10, word: ':'},
                                  {type: WORD.KEYWORD, line: 0, column: 11, word: 'false'}]);
      testEql('{do:do,try:try}', [{type: WORD.SYMBLE, line: 0, column: 0, word: '{'},
                                  {type: WORD.IDENTIFIER, line: 0, column: 1, word: 'do'},
                                  {type: WORD.SYMBLE, line: 0, column: 3, word: ':'},
                                  {type: WORD.KEYWORD, line: 0, column: 4, word: 'do'},
                                  {type: WORD.SYMBLE, line: 0, column: 6, word: ','},
                                  {type: WORD.IDENTIFIER, line: 0, column: 7, word: 'try'},
                                  {type: WORD.SYMBLE, line: 0, column: 10, word: ':'},
                                  {type: WORD.KEYWORD, line: 0, column: 11, word: 'try'},
                                  {type: WORD.SYMBLE, line: 0, column: 14, word: '}'}]);
    });

  });

});