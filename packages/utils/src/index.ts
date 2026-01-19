/**
 * @hamhome/utils - HamHome 通用工具函数
 */

export * from './url';
export * from './string';
export * from './date';
export * from './logger';

// 版本常量，用于验证模块引用
export const UTILS_VERSION = '1.0.0';

console.log('[@hamhome/utils] loaded, version:', UTILS_VERSION);

