/**
 * 词法分析器 单元测试
 */


var should = require('should');
var token = require('../lib/compiler/token');
var define = require('../lib/compiler/define');


describe('compiler/token', function () {

  describe('_parse() 原始分词', function () {
    var parse = token._parse;
    var TOKEN = define.TOKEN;
    var testEql = function (str, obj) {
      return parse(str).should.eql(obj);
    };

    it('正常数字', function () {
      testEql('123', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123'}]);
      testEql('123.456', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123.456'}]);
      testEql('123e123', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123e123'}]);
      testEql('123e123.456', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123e123.456'}]);
      testEql('123E123', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123E123'}]);
      testEql('123.E123', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123.E123'}]);
      testEql('123e+123', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123e+123'}]);
      testEql('123e-123', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123e-123'}]);
      testEql('123.456e123', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123.456e123'}]);
      testEql('123.456e123.456', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123.456e123.456'}]);
      testEql('123.456e-123.456', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '123.456e-123.456'}]);
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
      testEql('"hello=jkfjkfs"', [{type: TOKEN.STRING, line: 0, column: 0, text: '"hello=jkfjkfs"'}]);
      testEql('"hello=\nd\njkfjkfs"', [{type: TOKEN.STRING, line: 0, column: 0, text: '"hello=\\nd\\njkfjkfs"'}]);
      testEql('"hello=\\\"jkfjkfs"', [{type: TOKEN.STRING, line: 0, column: 0, text: '"hello=\\\"jkfjkfs"'}]);
      testEql('"abc\\"\'\r\n\t\\""', [{type: TOKEN.STRING, line: 0, column: 0, text: '"abc\\"\'\\r\\n\t\\""'}]);
    });

    it('异常字符串', function () {
      testEql('"fdkkkfd', {error: 'SyntaxError: Unexpected end of input', line: 0, column: 8});
    });

    it('符号', function () {
      testEql('+-*/', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '+'},
                       {type: TOKEN.SYMBLE, line: 0, column: 1, text: '-'},
                       {type: TOKEN.SYMBLE, line: 0, column: 2, text: '*'},
                       {type: TOKEN.SYMBLE, line: 0, column: 3, text: '/'}]);
    });

    it('正常单词', function () {
      testEql('hello', [{type: TOKEN.NAME, line: 0, column: 0, text: 'hello'}]);
      testEql('hello34', [{type: TOKEN.NAME, line: 0, column: 0, text: 'hello34'}]);
      testEql('hello_s', [{type: TOKEN.NAME, line: 0, column: 0, text: 'hello_s'}]);
      testEql('_hello', [{type: TOKEN.NAME, line: 0, column: 0, text: '_hello'}]);
      testEql('$', [{type: TOKEN.NAME, line: 0, column: 0, text: '$'}]);
      testEql('_', [{type: TOKEN.NAME, line: 0, column: 0, text: '_'}]);
      testEql('$$_f', [{type: TOKEN.NAME, line: 0, column: 0, text: '$$_f'}]);
    });

    it('异常单词', function () {
      testEql('0abcd', {error: 'SyntaxError: Unexpected token a', line: 0, column: 1});
    });

    it('单行注释', function () {
      testEql('//abcd', [{type: TOKEN.COMMENT, line: 0, column: 0, text: '//abcd'}]);
      testEql('//abcd//sss', [{type: TOKEN.COMMENT, line: 0, column: 0, text: '//abcd//sss'}]);
      testEql('//abc\nabc', [{type: TOKEN.COMMENT, line: 0, column: 0, text: '//abc'},
                             {type: TOKEN.NAME, line: 1, column: 0, text: 'abc'}]);
    });

    it('多行注释', function () {
      testEql('/*hello*/', [{type: TOKEN.COMMENT, line: 0, column: 0, text: '/*hello*/'}]);
      testEql('/*how*//*are*//*you*/', [{type: TOKEN.COMMENT, line: 0, column: 0, text: '/*how*/'},
                                        {type: TOKEN.COMMENT, line: 0, column: 7, text: '/*are*/'},
                                        {type: TOKEN.COMMENT, line: 0, column: 14, text: '/*you*/'}]);
      testEql('/*\nabc\n*//*\nefg\n*/', [{type: TOKEN.COMMENT, line: 0, column: 0, text: '/*\nabc\n*/'},
                                         {type: TOKEN.COMMENT, line: 2, column: 2, text: '/*\nefg\n*/'}]);
      testEql('/*\nabc*/\nabc', [{type: TOKEN.COMMENT, line: 0, column: 0, text: '/*\nabc*/'},
                                 {type: TOKEN.NAME, line: 2, column: 0, text: 'abc'}]);
    });

    it('单行综合测试', function () {
      testEql('if a + b = 10', [{type: TOKEN.NAME, line: 0, column: 0, text: 'if'},
                                {type: TOKEN.BLANK, line: 0, column: 2, text: ' '},
                                {type: TOKEN.NAME, line: 0, column: 3, text: 'a'},
                                {type: TOKEN.BLANK, line: 0, column: 4, text: ' '},
                                {type: TOKEN.SYMBLE, line: 0, column: 5, text: '+'},
                                {type: TOKEN.BLANK, line: 0, column: 6, text: ' '},
                                {type: TOKEN.NAME, line: 0, column: 7, text: 'b'},
                                {type: TOKEN.BLANK, line: 0, column: 8, text: ' '},
                                {type: TOKEN.SYMBLE, line: 0, column: 9, text: '='},
                                {type: TOKEN.BLANK, line: 0, column: 10, text: ' '},
                                {type: TOKEN.NUMBER, line: 0, column: 11, text: '10'},]);
      testEql('if a+b=10', [{type: TOKEN.NAME, line: 0, column: 0, text: 'if'},
                            {type: TOKEN.BLANK, line: 0, column: 2, text: ' '},
                            {type: TOKEN.NAME, line: 0, column: 3, text: 'a'},
                            {type: TOKEN.SYMBLE, line: 0, column: 4, text: '+'},
                            {type: TOKEN.NAME, line: 0, column: 5, text: 'b'},
                            {type: TOKEN.SYMBLE, line: 0, column: 6, text: '='},
                            {type: TOKEN.NUMBER, line: 0, column: 7, text: '10'},]);
      testEql('"abc"  +50="abc50"', [{type: TOKEN.STRING, line: 0, column: 0, text: '"abc"'},
                                       {type: TOKEN.BLANK, line: 0, column: 5, text: '  '},
                                       {type: TOKEN.SYMBLE, line: 0, column: 7, text: '+'},
                                       {type: TOKEN.NUMBER, line: 0, column: 8, text: '50'},
                                       {type: TOKEN.SYMBLE, line: 0, column: 10, text: '='},
                                       {type: TOKEN.STRING, line: 0, column: 11, text: '"abc50"'}]);
      testEql('"abc"+50="abc50"', [{type: TOKEN.STRING, line: 0, column: 0, text: '"abc"'},
                                    {type: TOKEN.SYMBLE, line: 0, column: 5, text: '+'},
                                    {type: TOKEN.NUMBER, line: 0, column: 6, text: '50'},
                                    {type: TOKEN.SYMBLE, line: 0, column: 8, text: '='},
                                    {type: TOKEN.STRING, line: 0, column: 9, text: '"abc50"'}]);
      testEql('abc;//abc', [{type: TOKEN.NAME, line: 0, column: 0, text: 'abc'},
                            {type: TOKEN.SYMBLE, line: 0, column: 3, text: ';'},
                            {type: TOKEN.COMMENT, line: 0, column: 4, text: '//abc'}]);
    });

    it('多行综合测试', function () {
      testEql('if (a+10="123") {\n\tok()\n} else {\n\texit\n}', [{type: TOKEN.NAME, line: 0, column: 0, text: 'if'},
                                                                 {type: TOKEN.BLANK, line: 0, column: 2, text: ' '},
                                                                 {type: TOKEN.SYMBLE, line: 0, column: 3, text: '('},
                                                                 {type: TOKEN.NAME, line: 0, column: 4, text: 'a'},
                                                                 {type: TOKEN.SYMBLE, line: 0, column: 5, text: '+'},
                                                                 {type: TOKEN.NUMBER, line: 0, column: 6, text: '10'},
                                                                 {type: TOKEN.SYMBLE, line: 0, column: 8, text: '='},
                                                                 {type: TOKEN.STRING, line: 0, column: 9, text: '"123"'},
                                                                 {type: TOKEN.SYMBLE, line: 0, column: 14, text: ')'},
                                                                 {type: TOKEN.BLANK, line: 0, column: 15, text: ' '},
                                                                 {type: TOKEN.SYMBLE, line: 0, column: 16, text: '{'},
                                                                 {type: TOKEN.BLANK, line: 1, column: 0, text: '\t'},
                                                                 {type: TOKEN.NAME, line: 1, column: 1, text: 'ok'},
                                                                 {type: TOKEN.SYMBLE, line: 1, column: 3, text: '('},
                                                                 {type: TOKEN.SYMBLE, line: 1, column: 4, text: ')'},
                                                                 {type: TOKEN.SYMBLE, line: 2, column: 0, text: '}'},
                                                                 {type: TOKEN.BLANK, line: 2, column: 1, text: ' '},
                                                                 {type: TOKEN.NAME, line: 2, column: 2, text: 'else'},
                                                                 {type: TOKEN.BLANK, line: 2, column: 6, text: ' '},
                                                                 {type: TOKEN.SYMBLE, line: 2, column: 7, text: '{'},
                                                                 {type: TOKEN.BLANK, line: 3, column: 0, text: '\t'},
                                                                 {type: TOKEN.NAME, line: 3, column: 1, text: 'exit'},
                                                                 {type: TOKEN.SYMBLE, line: 4, column: 0, text: '}'},]);
      testEql('call(/* abc */ ok) // not ok\n/*\nhaha\n*/www', [{type: TOKEN.NAME, line: 0, column: 0, text: 'call'},
                                                                {type: TOKEN.SYMBLE, line: 0, column: 4, text: '('},
                                                                {type: TOKEN.COMMENT, line: 0, column: 5, text: '/* abc */'},
                                                                {type: TOKEN.BLANK, line: 0, column: 14, text: ' '},
                                                                {type: TOKEN.NAME, line: 0, column: 15, text: 'ok'},
                                                                {type: TOKEN.SYMBLE, line: 0, column: 17, text: ')'},
                                                                {type: TOKEN.BLANK, line: 0, column: 18, text: ' '},
                                                                {type: TOKEN.COMMENT, line: 0, column: 19, text: '// not ok'},
                                                                {type: TOKEN.COMMENT, line: 1, column: 0, text: '/*\nhaha\n*/'},
                                                                {type: TOKEN.NAME, line: 3, column: 2, text: 'www'},]);
    });
  });

  
  describe('parse() 最终输出', function () {
    var parse = token.parse;
    var TOKEN = define.TOKEN;
    var testEql = function (str, obj) {
      return parse(str).should.eql(obj);
    };

    it('关键词处理 - 正常情况', function () {
      testEql('false', [{type: TOKEN.IDENTIFIER, line: 0, column: 0, text: 'false'}]);
      testEql('false.true', [{type: TOKEN.IDENTIFIER, line: 0, column: 0, text: 'false'},
                             {type: TOKEN.SYMBLE, line: 0, column: 5, text: '.'},
                             {type: TOKEN.IDENTIFIER, line: 0, column: 6, text: 'true'}]);
      testEql('{false:true}', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '{'},
                               {type: TOKEN.IDENTIFIER, line: 0, column: 1, text: 'false'},
                               {type: TOKEN.SYMBLE, line: 0, column: 6, text: ':'},
                               {type: TOKEN.IDENTIFIER, line: 0, column: 7, text: 'true'},
                               {type: TOKEN.SYMBLE, line: 0, column: 11, text: '}'}]);
      testEql('false?true:false', [{type: TOKEN.IDENTIFIER, line: 0, column: 0, text: 'false'},
                                  {type: TOKEN.SYMBLE, line: 0, column: 5, text: '?'},
                                  {type: TOKEN.IDENTIFIER, line: 0, column: 6, text: 'true'},
                                  {type: TOKEN.SYMBLE, line: 0, column: 10, text: ':'},
                                  {type: TOKEN.IDENTIFIER, line: 0, column: 11, text: 'false'}]);
      testEql('{in:in,for:for}', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '{'},
                                  {type: TOKEN.IDENTIFIER, line: 0, column: 1, text: 'in'},
                                  {type: TOKEN.SYMBLE, line: 0, column: 3, text: ':'},
                                  {type: TOKEN.KEYWORD, line: 0, column: 4, text: 'in'},
                                  {type: TOKEN.SYMBLE, line: 0, column: 6, text: ','},
                                  {type: TOKEN.IDENTIFIER, line: 0, column: 7, text: 'for'},
                                  {type: TOKEN.SYMBLE, line: 0, column: 10, text: ':'},
                                  {type: TOKEN.KEYWORD, line: 0, column: 11, text: 'for'},
                                  {type: TOKEN.SYMBLE, line: 0, column: 14, text: '}'}]);
    });

    it('特殊数字', function () {
      testEql('.567', [{type: TOKEN.NUMBER, line: 0, column: 0, text: '.567'}]);
      testEql('abc.123', [{type: TOKEN.IDENTIFIER, line: 0, column: 0, text: 'abc'},
                          {type: TOKEN.SYMBLE, line: 0, column: 3, text: '.'},
                          {type: TOKEN.NUMBER, line: 0, column: 4, text: '123'}]);
      testEql('+.5', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '+'},
                      {type: TOKEN.NUMBER, line: 0, column: 1, text: '.5'}]);
    });

    it('多个符号', function () {
      testEql('++', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '++'}]);
      testEql('++<=', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '++'},
                       {type: TOKEN.SYMBLE, line: 0, column: 2, text: '<='}]);
      testEql('+\n+', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '+'},
                       {type: TOKEN.SYMBLE, line: 1, column: 0, text: '+'}]);
      testEql('====', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '==='},
                       {type: TOKEN.SYMBLE, line: 0, column: 3, text: '='}]);
      testEql('=!==', [{type: TOKEN.SYMBLE, line: 0, column: 0, text: '='},
                       {type: TOKEN.SYMBLE, line: 0, column: 1, text: '!=='}]);
    });

  });

});