/**
 * EasyScript 编译器/常量定义
 *
 * @author 老雷<leizongmin@gmail.com>
 */


// 单词类型
exports.WORD = {
  BLANK:      0,    // 空白
  SYMBLE:     1,    // 符号
  NUMBER:     2,    // 数值
  STRING:     4,    // 字符串
  NAME:       8,    // 名称（可能为关键字或标识符）
  KEYWORD:    16,   // 关键词
  IDENTIFIER: 32,   // 标识符
  COMMENT:    64,   // 注释
};


// 关键字列表
exports.KEYWORD = [
  // 基本关键字
  'break', 'delete', 'function', 'return', 'typeof', 'case', 'do', 'if', 'switch',
  'var', 'catch', 'else', 'in', 'this', 'void', 'continue', 'false', 'instanceof',
  'throw', 'while', 'debugger', 'finally', 'new', 'true', 'with', 'default', 'for',
  'null', 'try',
  // 保留关键字
  'abstract', 'double', 'goto', 'native', 'static', 'boolean', 'enum', 'implements',
  'package', 'super', 'byte', 'export', 'import', 'private', 'synchronized', 'char',
  'extends', 'int', 'protected', 'throws', 'class', 'final', 'interface', 'public',
  'transient', 'const', 'float', 'long', 'short', 'volatile',
  // 扩展关键字
  '$defer', '$await'
];
