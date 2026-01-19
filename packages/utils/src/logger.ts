export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  namespace?: string;
  enabled?: boolean;
  minLevel?: LogLevel;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_STYLE_MAP: Record<LogLevel, string> = {
  debug: 'color:#999;',
  info: 'color:#1677ff;',
  warn: 'color:#faad14;',
  error: 'color:#ff4d4f;font-weight:bold;',
};

declare const process: { env?: { NODE_ENV?: string } } | undefined;
const IS_PROD = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production';

function formatTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (childNamespace: string, options?: Omit<LoggerOptions, 'namespace'>) => Logger;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    namespace = 'app',
    enabled = !IS_PROD,
    minLevel = 'debug',
  } = options;

  const minPriority = LOG_LEVEL_PRIORITY[minLevel];

  function createPrinter(level: LogLevel): (...args: unknown[]) => void {
    if (!enabled || LOG_LEVEL_PRIORITY[level] < minPriority) {
      return () => {};
    }

    const timeStyle = 'color:#8c8c8c;';
    const levelStyle = LEVEL_STYLE_MAP[level];
    const consoleFn = console[level] || console.log;

    // 使用 bind 保留原始调用栈，点击可跳转到调用位置
    return consoleFn.bind(
      console,
      `%c[${formatTime()}]%c[${namespace}][${level.toUpperCase()}]`,
      timeStyle,
      levelStyle,
    );
  }

  function child(childNamespace: string, childOptions: Omit<LoggerOptions, 'namespace'> = {}): Logger {
    return createLogger({
      namespace: `${namespace}:${childNamespace}`,
      enabled: childOptions.enabled ?? enabled,
      minLevel: childOptions.minLevel ?? minLevel,
    });
  }

  return {
    get debug() { return createPrinter('debug'); },
    get info() { return createPrinter('info'); },
    get warn() { return createPrinter('warn'); },
    get error() { return createPrinter('error'); },
    child,
  };
}

export default createLogger;