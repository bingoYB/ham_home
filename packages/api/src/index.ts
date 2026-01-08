/**
 * HamHome API - Cloudflare Workers + Hono
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { TYPES_VERSION } from '@hamhome/types';
import type { Env } from './types/env';

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>();

// 全局中间件
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: [
    'https://hamhome.app',
    'chrome-extension://*',
    'http://localhost:3000',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// 健康检查
app.get('/health', (c) => {
  console.log('[@hamhome/api] 健康检查请求');
  return c.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT,
    typesVersion: TYPES_VERSION,
  });
});

// 根路由
app.get('/', (c) => {
  console.log('[@hamhome/api] API 根路由访问');
  return c.json({
    name: 'HamHome API',
    version: '1.0.0',
    message: '🐹 HamHome API is running!',
  });
});

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('[@hamhome/api] Error:', err);
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: c.env.ENVIRONMENT === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  }, 500);
});

console.log('[@hamhome/api] 模块加载成功');

export default app;

