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
  time: (label: string) => () => void;
  timeLog: (label: string, message?: string) => void;
  timeEnd: (label: string) => void;
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

  const timers = new Map<string, { start: number; last: number }>();

  function time(label: string): () => void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    timers.set(label, { start: now, last: now });
    return () => timeEnd(label);
  }

  function timeLog(label: string, message?: string): void {
    const timer = timers.get(label);
    if (!timer) {
      createPrinter('warn')(`Timer "${label}" does not exist`);
      return;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const total = (now - timer.start).toFixed(2);
    const delta = (now - timer.last).toFixed(2);
    timer.last = now; // 更新上一次打点时间
    
    const msg = message ? ` ${message}` : '';
    createPrinter('info')(`${label}:${msg} - total: ${total}ms, delta: ${delta}ms`);
  }

  function timeEnd(label: string): void {
    const timer = timers.get(label);
    if (!timer) {
      createPrinter('warn')(`Timer "${label}" does not exist`);
      return;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const total = (now - timer.start).toFixed(2);
    timers.delete(label);
    createPrinter('info')(`${label}: finished - total: ${total}ms`);
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
    time,
    timeLog,
    timeEnd,
    child,
  };
}

export default createLogger;

export const logger = createLogger({
    namespace: "agent"
});
