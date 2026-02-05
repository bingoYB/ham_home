/**
 * Memoize 工具
 * 用于缓存函数结果，提升性能
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/**
 * 简单的 memoizeOne 实现
 * 缓存最近一次调用的结果
 */
export function memoizeOne<T extends AnyFunction>(
  fn: T,
  isEqual: (newArgs: Parameters<T>, lastArgs: Parameters<T>) => boolean = (
    newArgs,
    lastArgs
  ) => {
    if (newArgs.length !== lastArgs.length) return false;
    for (let i = 0; i < newArgs.length; i++) {
      if (newArgs[i] !== lastArgs[i]) return false;
    }
    return true;
  }
): T {
  let lastArgs: Parameters<T> | undefined;
  let lastResult: ReturnType<T> | undefined;
  let calledOnce = false;

  const memoized = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    if (calledOnce && lastArgs && isEqual(args, lastArgs)) {
      return lastResult as ReturnType<T>;
    }

    lastResult = fn.apply(this, args);
    lastArgs = args;
    calledOnce = true;
    return lastResult as ReturnType<T>;
  } as T;

  return memoized;
}

/**
 * 简单的 TrieMemoize 实现
 * 基于参数路径缓存结果，适用于多参数缓存
 * 这里简化实现，主要用于 RenderComponent 的缓存
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trieMemoize<T extends AnyFunction>(fn: T): T {
  // 使用 Map 树存储缓存
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = new Map<any, any>();
  const RESULT_KEY = Symbol('RESULT');

  const memoized = function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentCache = cache;
    
    for (const arg of args) {
      if (!currentCache.has(arg)) {
        currentCache.set(arg, new Map());
      }
      currentCache = currentCache.get(arg);
    }

    if (currentCache.has(RESULT_KEY)) {
      return currentCache.get(RESULT_KEY);
    }

    const result = fn.apply(this, args);
    currentCache.set(RESULT_KEY, result);
    return result;
  } as T;

  return memoized;
}
