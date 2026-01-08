/**
 * @hamhome/storage - HamHome 存储抽象层
 */

export * from './types';
export { BaseStorageAdapter } from './base-adapter';

// 版本常量，用于验证模块引用
export const STORAGE_VERSION = '1.0.0';

console.log('[@hamhome/storage] 模块加载成功, 版本:', STORAGE_VERSION);

