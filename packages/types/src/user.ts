/**
 * 用户数据结构
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 认证用户信息
 */
export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

