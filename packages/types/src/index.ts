/**
 * @hamhome/types - HamHome 共享类型定义
 */

export * from './bookmark';
export * from './category';
export * from './user';
export * from './ai';
export * from './api';
export * from './settings';

// 版本常量，用于验证模块引用
export const TYPES_VERSION = '1.0.0';

console.log('[@hamhome/types] 模块加载成功, 版本:', TYPES_VERSION);

