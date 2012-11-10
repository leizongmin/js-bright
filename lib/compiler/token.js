/**
 * EasyScript 编译器/词法分析
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');

// 单词类型
var WORD = define.WORD;

// 词法分析状态
var STATUS = {
  BLANK:    0,
  NUMBER:   1,
  WORD:     2,
  SYMBLE:   3,
  STRING:   4
};

// 字符ASCII编码
var CHAR = {
  NUMBER_BEGIN:   48,     // 数字 0
  NUMBER_END:     57,     // 数字 9
  LOWER_BEGIN:    97,     // 字母 a
  LOWER_END:      122,    // 字母 z
  UPPER_BEGIN:    65,     // 字母 A
  UPPER_END:      90,     // 字母 Z
  UNDERLINE:      95,     // 下划线
  QUOTE_1:        39,     // 单引号
  QUOTE_2:        34,     // 双引号
  BACKSLASH:      92,     // 反斜杠 \
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
         c === CHAR.UNDERLINE
         ? true : false;
};

/**
 * 判断是否为空白字符
 *
 * @param {Integer} c
 * @return {Boolean}
 */
var isBlank = function (c) {
  return c <= 32 ? true : false;
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
 * 分析代码，返回单词数组
 * 返回一个对象表示出错：  {error: '出错信息', line: 行, column: 列}
 *
 * @param {String} source
 * @return Array
 */
exports.parse = function (source) {
  source += ' ';
  var length = source.length;
  var curPos;
  var lastPos = 0;
  var curStatus = STATUS.BLANK;
  var words = [];

  // 临时状态
  var quoteBegin = false;     // 字符串开始，是单引号还是双引号
  var numberHasE = false;     // 数值是否出现e字母
  var numberHasDot = false;   // 数值是否出现点
  var numberHasSign = false;  // 数值是否出现正负符号
  var prevCharIsBackslash = false;  // 字符串内上一个字符是否为反斜杠

  // 设置当前状态
  var setStatus = function (s) {
    curStatus = s;
  };

  // 添加单词
  var pushWord = function (t, plus) {
    if (!isNaN(plus)) {
      curPos += plus;
    }
    if (lastPos < curPos) {
      var w = source.slice(lastPos, curPos).trim();
      var word = {
        type:   t,
        start:  lastPos,
        word:   w
      };
      if (t === WORD.BLANK) {
        // 过滤掉空白字符
      } else {
        // 对字符串进行处理
        if (t === WORD.STRING) {
          w = w.substr(1, w.length - 2);
          word.word = w;
        }
        words.push(word);
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

  // 分析时出错
  var throwError = function (err) {
    var err = {
      error:    'SyntaxError: ' + err,
      position: curPos
    };
    throw err;
  };

  try {
    for (curPos = 0; curPos < length; curPos++) {
      var s = source[curPos];
      var c = source.charCodeAt(curPos);
      
      switch (curStatus) {
        // 判断是按照以下顺序：数字 > 字母 > 空白字符 > 标点符号

        // 当前状态为空白字符
        case STATUS.BLANK:
          if (isNumber(c)) {
            // 数值开始
            pushWord(WORD.BLANK);
            setStatus(STATUS.NUMBER);
          } else if (isLetter(c)) {
            // 单词开始
            pushWord(WORD.BLANK);
            setStatus(STATUS.WORD);
          } else if (isQuote(c)) {
            // 字符串开始
            pushWord(WORD.BLANK);
            quoteBegin = c;
            setStatus(STATUS.STRING);
          } else if (isBlank(c)) {
            // 仍然是空白字符
          } else {
            // 其它符号
            pushWord(WORD.BLANK);
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
            pushWord(WORD.NUMBER);
            setStatus(STATUS.BLANK);
          } else {
            // 如果为第一次出现小数点，或者第一次出现正负符号
            if (numberHasDot === false && s === '.') {
              numberHasDot = true;
            } else if (numberHasSign === false && (s === '+' || s === '-')) {
              numberHasSign = true;
            } else {
              // 数值结束
              pushWord(WORD.NUMBER);
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为单词
        case STATUS.WORD:
          if (isNumber(c) || isLetter(c)) {
            // 仍然是单词
          } else if (isBlank(c)) {
            // 单词结束
            pushWord(WORD.WORD);
            setStatus(STATUS.BLANK);
          } else {
            // 如果是下划线，则仍然是单词
            if (s === '_') {
              // 仍然是单词
            } else {
              // 单词结束
              pushWord(WORD.WORD);
              setStatus(STATUS.SYMBLE);
            }
          }
          break;

        // 当前状态为符号
        case STATUS.SYMBLE:
          // 将符号分割成单个字符
          pushWord(WORD.SYMBLE);
          if (isNumber(c)) {
            // 数值开始
            setStatus(STATUS.NUMBER);
          } else if (isLetter(c)) {
            // 单词开始
            setStatus(STATUS.WORD);
          } else if (isBlank(c)) {
            setStatus(STATUS.BLANK);
          } else {
            setStatus(STATUS.SYMBLE);
          }
          break;

        // 当前状态为字符串
        case STATUS.STRING:
          // 只有遇到相同的引号才结束
          if (c === quoteBegin && prevCharIsBackslash === false) {
            // 字符串结束
            pushWord(WORD.STRING, 1);
            setStatus(STATUS.BLANK);
          } else if (c === CHAR.BACKSLASH) {
            prevCharIsBackslash = !prevCharIsBackslash;
          } else if (prevCharIsBackslash) {
            prevCharIsBackslash = false;
            // 字符串还未结束
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
      return words;
    }
  } catch (err) {
    return err;
  }
};



// 测试
console.log(exports.parse('_as_f = 1-8 1e8.5 "ddsds\\"\'ds"'));
//console.log(exports.parse('as_f = 18.5'));
//console.log(exports.parse('+-18.5e5.5e'));