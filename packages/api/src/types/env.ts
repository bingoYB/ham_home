/**
 * Cloudflare Workers 环境变量类型定义
 */
export interface Env {
  // Cloudflare Bindings (需要在 wrangler.toml 中配置后启用)
  // DB: D1Database;
  // VECTORIZE: VectorizeIndex;
  // AI: Ai;
  
  // Environment Variables
  ENVIRONMENT: 'development' | 'production';
  
  // Secrets (通过 wrangler secret 设置)
  // SUPABASE_JWT_SECRET: string;
  // SUPABASE_URL: string;
  // STORJ_ENDPOINT: string;
  // STORJ_BUCKET: string;
  // STORJ_ACCESS_KEY: string;
  // STORJ_SECRET_KEY: string;
}

