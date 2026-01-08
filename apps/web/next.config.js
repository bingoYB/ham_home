const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hamhome/ui', '@hamhome/types', '@hamhome/utils'],
  images: {
    unoptimized: true,
  },
  // Turbopack 别名配置
  experimental: {
    turbo: {
      resolveAlias: {
        '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      },
    },
  },
  // Webpack 别名配置（生产构建时使用）
  webpack: (config) => {
    config.resolve.alias['@ui'] = path.resolve(__dirname, '../../packages/ui/src');
    return config;
  },
};

module.exports = nextConfig;

