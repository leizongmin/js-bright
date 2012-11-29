/**
 * bright 编译器/常量定义
 *
 * @author 老雷<leizongmin@gmail.com>
 */


// 单词类型
exports.TOKEN = {
  BLANK:      0,    // 空白
  SYMBLE:     1,    // 符号
  NUMBER:     2,    // 数值
  STRING:     4,    // 字符串
  NAME:       8,    // 名称（可能为关键字或标识符）
  KEYWORD:    16,   // 关键词
  IDENTIFIER: 32,   // 标识符
  COMMENT:    64    // 注释
};


// 关键字列表
exports.KEYWORD = [
  'await',
  'argument',
  'break',
  'continue',
  'defer',
  'else',
  'elseif',
  'false',
  'for',
  'function',
  'if',
  'in',
  'javascript',
  'let',
  'NaN',
  'null',
  'return',
  'sleep',
  'throw',
  'true',
  'undefined',
  'var'
];
