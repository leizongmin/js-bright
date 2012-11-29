/**
 * bright 编译器/词法分析
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');

// 单词类型
var TOKEN = define.TOKEN;

// 关键字列表
var KEYWORD = define.KEYWORD;
var _KEYWORD = {};
KEYWORD.forEach(function (w) {
  _KEYWORD[w] = true;
});

// 词法分析状态
var STATUS = {
  BLANK:      0,          // 空白字符
  SYMBLE:     1,          // 符号
  NUMBER:     2,          // 数值
  STRING:     4,          // 字符串
  NAME:       8,          // 名称（可能为关键字或标识符）
  COMMENT_1:  16,         // "//"开头的单行注释
  COMMENT_2:  32          // "/*"开头的多行注释
};

// 字符ASCII编码
var CHAR = {
  NUMBER_BEGIN:   48,     // 数字 0
  NUMBER_END:     57,     // 数字 9
  LOWER_BEGIN:    97,     // 字母 a
  LOWER_END:      122,    // 字母 z
  UPPER_BEGIN:    65,     // 字母 A
  UPPER_END:      90,     // 字母 Z
  UNDERLINE:      95,     // 下划线 _
  QUOTE_1:        39,     // 单引号 '
  QUOTE_2:        34,     // 双引号 "
  BACKSLASH:      92,     // 反斜杠 \
  DOLLAR:         36,     // 美元符号 $
  STAR:           42,     // 星号 *
  FORWARDSLASH:   47      // 斜杠 /
};

/**
 * 判断字符是否为数字
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isNumber = function (c) {
  return c >= CHAR.NUMBER_BEGIN && c <= CHAR.NUMBER_END ? true : false;
};

/**
 * 判断字符是否为字母
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isLetter = function (c) {
  return (c >= CHAR.UPPER_BEGIN && c <= CHAR.UPPER_END) ||
         (c >= CHAR.LOWER_BEGIN && c <= CHAR.LOWER_END) ||
         c === CHAR.UNDERLINE || c === CHAR.DOLLAR
         ? true : false;
};

/**
 * 判断是否为空白字符
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isBlank = function (c) {
  return isNaN(c) || c <= 32 ? true : false;
};

/**
 * 判断字符是否为引号
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isQuote = function (c) {
  return c === CHAR.QUOTE_1 || c === CHAR.QUOTE_2 ? true : false;
};

/**
 * 判断字符是否为换行符
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isNewLine = function (c) {
  return c === 10 || c === 13 ? true : false;
};

/**
 * 是否为关键字
 *
 * @param {String} w
 * @return {Boolean}
 */
var isKeyword = function (w) {
  return _KEYWORD[w] ? true : false;
};


/**
 * 分析代码，返回单词数组（未判断关键词）
 * 
 * 返回一个对象表示出错：{error: '出错信息', line: 行, column: 列}
 * 每个数组元素结构：{type: 单词类型, line: 行号, column: 当前行的位置, text: 单词}
 * 行号和位置从0开始
 *
 * @param {String} source
 * @return Array
 */
exports._parse = function (source) {
  source += ' ';                    // 加一个空格以便于最后判断结尾是否正确
  var length = source.length;       // 源码长度
  var curPos;                       // 当前字符位置
  var lastPos = 0;                  // 当前单词的开始位置（上一个单词结束位置）
  var lineNum = 0;                  // 当前行号
  var linePos = 0;                  // 当前行的位置
  var curToken = {line: 0, column: 0}; // 当前单词开始的位置
  var curStatus = STATUS.BLANK;     // 当前单词的状态（判断单词类型）
  var tokenList = [];                   // 已分析的单词数组（按顺序）

  // 临时状态
  var quoteBegin = false;           // 字符串开始，是单引号还是双引号
  var numberHasE = false;           // 数值是否出现e字母
  var numberHasDot = false;         // 数值是否出现点
  var numberHasSign = false;        // 数值是否出现正负符号
  var prevCharIsBackslash = false;  // 字符串内上一个字符是否为反斜杠

  // 开始新行
  var startNewLine = function () {
    lineNum++;
    linePos = 0;
  };

  // 下一个字符
  var nextChar = function (c) {
    if (c === 13) {
      // \r 换行
      startNewLine();
    } else if (c === 10) {
      var pc = source.charCodeAt(curPos - 1);
      if (pc === 13) {
        // \r\n换行，上一个已经换行了，这个忽略
      } else {
        startNewLine();
      }
    } else {
      linePos++;
    }
  };

  // 设置当前状态
  var setStatus = function (s) {
    curStatus = s;
    curToken = {
      line:    lineNum,
      column:  linePos - 1
    };
  };

  // 添加单词，末尾为当前位置的前面（不包括当前字符），可通过curPos来控制
  var pushToken = function (t) {
    if (lastPos < curPos) {
      var w = source.slice(lastPos, curPos);
      var token = {
        type:   t,
        line:   curToken.line,
        column: curToken.column,
        text:   w.trim()
      };
      if (t === TOKEN.BLANK) {
        // colum=-1，以\r或\n开头的情况
        w = w.replace(/\r|\n/img, '');
        if (token.column < 0) {
          token.column = 0;
        }
        if (w.length > 0) {
          token.text = w;
          tokenList.push(token);
        }
      } else {
        // 将字符串中的换行符转换成\n
        if (t === TOKEN.STRING) {
          token.text = token.text.replace(/\n/gm, '\\n').replace(/\r/gm, '\\r');
        }
        tokenList.push(token);
      }
    }
    lastPos = curPos;
    // 初始化临时状态
    quoteBegin = false;
    numberHasE = false;
    numberHasDot = false;
    numberHasSign = false;
    prevCharIsBackslash = false;
  };

  // 当前字符状态结束，预判断下一个字符
  var checkNextChar = function () {
    var c = source.charCodeAt(curPos);
    // 分析行号位置
    nextChar(c);
    // 重新判断字符状态
    if (isNumber(c)) {
      setStatus(STATUS.NUMBER);
    } else if (isLetter(c)) {
      setStatus(STATUS.NAME);
    } else if (isBlank(c)) {
      setStatus(STATUS.BLANK);
    } else {
      setStatus(STATUS.SYMBLE);
    }
  };

  // 分析时出错
  var throwError = function (err) {
    var err = {
      error:    'SyntaxError: ' + err,
      line:     lineNum,
      column:   linePos - 1
    };
    throw err;
  };

  try {
    for (curPos = 0; curPos < length; curPos++) {
      var s = source[curPos];
      var c = source.charCodeAt(curPos);

      // 行号位置分析
      nextChar(c);

      // 逐个分析字符
      switch (curStatus) {
        // 判断是按照以下顺序：数字 > 字母 > 空白字符 > 字符串 > 标点符号

        // 当前状态为空白字符
        case STATUS.BLANK:
          if (isNumber(c)) {
            // 数值开始
            pushToken(TOKEN.BLANK);
            setStatus(STATUS.NUMBER);
          } else if (isLetter(c)) {
            // 单词开始
            pushToken(TOKEN.BLANK);
            setStatus(STATUS.NAME);
          } else if (isQuote(c)) {
            // 字符串开始
            pushToken(TOKEN.BLANK);
            quoteBegin = c;
            setStatus(STATUS.STRING);
          } else if (isBlank(c)) {
            // 仍然是空白字符
          } else {
            // 其它符号
            pushToken(TOKEN.BLANK);
            setStatus(STATUS.SYMBLE);
          }
          break;

        // 当前状态为数值
        case STATUS.NUMBER:
          if (isNumber(c)) {
            // 仍然是数值
          } else if (isLetter(c)) {
            // 如果为第一次出现的e或E，则仍然是数值
            if (numberHasE === false && (s === 'e' || s === 'E')) {
              // 则仍然是数值
              numberHasE = true;
              numberHasSign = false;
              numberHasDot = false;
            } else {
              // 错误
              throwError('Unexpected token ' + s);
            }
          } else if (isBlank(c)) {
            // 数值结束
            pushToken(TOKEN.NUMBER);
            setStatus(STATUS.BLANK);
          } else {
            // 如果为第一次出现小数点，或者在e后第一次出现正负符号
            if (s === '.') {
              if (numberHasDot) {
                // 错误
                throwError('Unexpected token ' + s);
              } else {
                numberHasDot = true;
              }
            } else if (numberHasE && s === '+' || s === '-') {
              if (numberHasSign) {
                // 错误
                throwError('Unexpected token ' + s);
              } else {
                numberHasSign = true;
              }
            } else {
              // 数值结束
              pushToken(TOKEN.NUMBER);
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为单词
        case STATUS.NAME:
          if (isNumber(c) || isLetter(c)) {
            // 仍然是单词
          } else if (isBlank(c)) {
            // 单词结束
            pushToken(TOKEN.NAME);
            setStatus(STATUS.BLANK);
          } else {
            // 如果是下划线，则仍然是单词
            if (s === '_') {
              // 仍然是单词
            } else {
              // 单词结束
              pushToken(TOKEN.NAME);
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为符号
        case STATUS.SYMBLE:
          // 如果上一个字符是/，则有可能是注释开始，如 // 或 /*
          var pc = source.charCodeAt(curPos - 1);
          if (c === CHAR.FORWARDSLASH && pc === CHAR.FORWARDSLASH) {
            // 单行注释开始（特殊情况，不用setStatus()来设置状态）
            curStatus = STATUS.COMMENT_1;
          } else if (pc === CHAR.FORWARDSLASH && c === CHAR.STAR) {
            // 多行注释开始（特殊情况，不用setStatus()来设置状态）
            curStatus = STATUS.COMMENT_2;
          } else {
            // 将符号分割成单个字符
            pushToken(TOKEN.SYMBLE);
            if (isNumber(c)) {
              // 数值开始
              setStatus(STATUS.NUMBER);
            } else if (isLetter(c)) {
              // 单词开始
              setStatus(STATUS.NAME);
            } else if (isBlank(c)) {
              setStatus(STATUS.BLANK);
            } else if (isQuote(c)) {
              // 字符串开始
              quoteBegin = c;
              setStatus(STATUS.STRING);
            } else {
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为字符串
        case STATUS.STRING:
          // 只有遇到相同的引号才结束
          if (c === quoteBegin && prevCharIsBackslash === false) {
            // 字符串结束
            curPos++;
            pushToken(TOKEN.STRING);
            // 特殊情况，直接判断下一个字符
            checkNextChar();
          } else if (c === CHAR.BACKSLASH) {
            prevCharIsBackslash = !prevCharIsBackslash;
          } else if (prevCharIsBackslash) {
            prevCharIsBackslash = false;
            // 字符串还未结束
          }
          break;

        // 当前状态为单行注释
        case STATUS.COMMENT_1:
          // 只有遇到换行符或到达文件末尾才结束
          if (isNewLine(c) || curPos >= length - 2) {
            curPos++;
            pushToken(TOKEN.COMMENT);
            // 特殊情况，直接判断下一个字符
            checkNextChar();
          }
          break;

        // 当前状态为多行注释
        case STATUS.COMMENT_2:
          // 只有遇到 */ 才结束
          if (c === CHAR.STAR) {
            var nc = source.charCodeAt(curPos + 1);
            if (nc === CHAR.FORWARDSLASH) {
              // 已确定下一个字符为注释的末尾
              curPos += 2;
              pushToken(TOKEN.COMMENT);
              // 特殊情况，直接判断下一个字符
              nextChar();
              checkNextChar();
            }
          }
          break;

        // 未知状态
        default:
          throwError('Unexpected token ILLEGAL');
      }
    }
    if (curStatus !== STATUS.BLANK) {
      throwError('Unexpected end of input');
    } else {
      return tokenList;
    }
  } catch (err) {
    return err;
  }
};


/**
 * 分析代码，返回单词数组
 * 
 * 返回一个对象表示出错：{error: '出错信息', line: 行, column: 列}
 * 每个数组元素结构：{type: 单词类型, line: 行号, column: 当前行的位置, text: 单词}
 * 行号和位置从0开始
 *
 * @param {String} source
 * @return Array
 */
exports.parse = function (source) {
  var tokenList = exports._parse(source);
  if (!Array.isArray(tokenList)) {
    return tokenList;
  }

  // 对返回的结果进行进一步处理
  for (var i = 0; i < tokenList.length; i++) {
    (function (w, i) {
      switch (w.type) {

        case TOKEN.NAME:
          if (isKeyword(w.text)) {
            // 排除使用关键字作为标识符的情况：
            // 1、前面有小数点，如：obj.false 或者 false.name （前面或后面有小数点）
            // 2、定义对象内部的键名，如：{false: 123456} （前面肯定是"{"或","，且后面是":"）
            var prevT = tokenList[i - 1];
            var nextT = tokenList[i + 1];
            prevT = prevT && prevT.type === TOKEN.SYMBLE ? prevT.text : null;
            nextT = nextT && nextT.type === TOKEN.SYMBLE ? nextT.text : null;
            if (prevT === '.' || nextT === '.') {
              w.type = TOKEN.IDENTIFIER;
            } else if ((prevT === '{' || prevT === ',') && nextT === ':') {
              w.type = TOKEN.IDENTIFIER;
            } else {
              w.type = TOKEN.KEYWORD;
            }
          } else {
            w.type = TOKEN.IDENTIFIER;
          }
          break;

        case TOKEN.NUMBER:
          // 如果数字前面有小数点，则将其合并，必须符合以下条件
          // 1、前一个字符必须是紧邻的（没有空白字符）
          // 2、小数点的前一个字符只能是符号或者空白
          var prevT = tokenList[i - 1];
          if (prevT && prevT.type === TOKEN.SYMBLE && prevT.text === '.') {
            if (prevT.column + 1 === w.column && prevT.line === w.line) {
              var prevT2 = tokenList[i - 2];
              if (!prevT2 || prevT2.type === TOKEN.SYMBLE) {
                var newW = {
                  type:   TOKEN.NUMBER,
                  text:   prevT.text + w.text,
                  line:   prevT.line,
                  column: prevT.column
                };
                tokenList[i - 1] = newW;
                tokenList.splice(i, 1);
                i--;
              }
            }
          }
          break;

        case TOKEN.SYMBLE:
          // 合并两个符号的操作符，如：++ -- << >> == >= <= != === !==
          var nextT = tokenList[i + 1];
          if (nextT && w.line === nextT.line) {
            if ((w.text === '+' && nextT.text === '+') ||
                (w.text === '-' && nextT.text === '-') ||
                (w.text === '<' && nextT.text === '<') ||
                (w.text === '>' && nextT.text === '>') ||
                (w.text === '=' && nextT.text === '=') ||
                (w.text === '>' && nextT.text === '=') ||
                (w.text === '<' && nextT.text === '=') ||
                (w.text === '!' && nextT.text === '=')) {
                  var newW = {
                    type:   TOKEN.SYMBLE,
                    text:   w.text + nextT.text,
                    line:   w.line,
                    column: w.column
                  };
                  // 如果是 !=== 或者 ===
                  var nextT2 = tokenList[i + 2];
                  if ((w.text === '=' || w.text === '!') && nextT.text === '=' && 
                       nextT2 && nextT2.type === TOKEN.SYMBLE && nextT2.text === '=') {
                    newW.text += nextT2.text;
                    tokenList.splice(i + 1, 2);
                  } else {
                    tokenList.splice(i + 1, 1);
                  }
                  tokenList[i] = newW;
                }
          }
      }
    })(tokenList[i], i);
  }
  
  // 将 true false null undefined NaN 转化成 IDENTIFIER
  var list = ['true', 'false', 'null', 'undefined', 'NaN'];
  tokenList.forEach(function (w) {
    if (w.type === TOKEN.KEYWORD && list.indexOf(w.text) !== -1) {
      w.type = TOKEN.IDENTIFIER;
    }
  });
  
  return tokenList;
};
