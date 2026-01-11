/**
 * i18next-scanner 配置文件
 * 用于自动扫描代码中的翻译键并生成翻译文件
 * 
 * 使用方法：
 * npx i18next-scanner
 * 
 * 或在 package.json 中添加脚本：
 * "i18n:scan": "i18next-scanner --config i18next-scanner.config.js"
 */

module.exports = {
  // 输入文件路径
  input: [
    'apps/extension/**/*.{js,jsx,ts,tsx}',
    'apps/web/**/*.{js,jsx,ts,tsx}',
    '!apps/extension/locales/**',
    '!apps/extension/node_modules/**',
    '!apps/web/node_modules/**',
  ],

  // 输出目录（相对于当前文件位置）
  output: './',

  // 选项
  options: {
    debug: false,

    // 扫描 t() 函数调用
    func: {
      list: ['i18next.t', 't', 'useTranslation', 'i18n.t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },

    // 要生成的语言
    lng: ['en', 'zh'],

    // 命名空间
    ns: ['common', 'bookmark', 'settings', 'ai'],

    // 默认语言和命名空间
    defaultLng: 'en',
    defaultNS: 'common',

    // 资源配置
    resource: {
      // 读取路径
      loadPath: 'apps/{{appName}}/locales/{{lng}}/{{ns}}.json',

      // 保存路径
      savePath: 'apps/{{appName}}/locales/{{lng}}/{{ns}}.new.json',

      // JSON 缩进
      jsonIndent: 2,

      // 换行符
      lineSeperator: '\n',
    },

    // 与 parser 相关的配置
    lngs: ['en', 'zh'],
    ns: ['common', 'bookmark', 'settings', 'ai'],

    // 如果翻译不存在，是否保存缺失的翻译
    saveMissing: true,
    saveMissingTo: 'all',

    // 缺失翻译路径
    saveMissingPluralsTo: 'all',

    // 输出为单个文件（不使用多个文件）
    nsSeparator: ':',
    keySeparator: '.',
    contextSeparator: '_',

    // 默认值
    defaultValue: '__STRING_NOT_TRANSLATED__',

    // 是否排序键
    sort: false,

    // 是否使用 flat（扁平化）结构
    flatArray: true,

    // 与 parser 的 'func.list' 中的参数位置对应
    // 例如，t('key', { ns: 'namespace' })
    attr: {
      list: ['i18nKey'],
      extensions: ['.jsx', '.tsx'],
    },

    // 是否在注释中搜索翻译
    comment: 'i18next-extract',
  },

  // Parser 配置
  parser: {
    // 日志输出
    logWarnFn: (message) => console.warn(message),
    logErrorFn: (message) => console.error(message),

    // 等待解析器完成
    wait: true,
  },

  // 自定义检查函数
  transformer: (files, enc, done, log) => {
    const transform = require('i18next-scanner').createTransform();
    
    // 对每个文件执行转换
    files.forEach((filePath) => {
      log(`Extracting keys from file: ${filePath}`);
    });

    return transform;
  },
};
