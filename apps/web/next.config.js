const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 静态导出配置 (用于 GitHub Pages)
  output: 'export',
  transpilePackages: ['@hamhome/ui', '@hamhome/types', '@hamhome/utils'],
  images: {
    unoptimized: true,
  },
  // Turbopack 配置
  turbopack: {
    resolveAlias: {
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@': path.resolve(__dirname, '.'),
    },
  },
  // Webpack 别名配置 (生产构建时使用)
  webpack: (config) => {
    config.resolve.alias['@ui'] = path.resolve(__dirname, '../../packages/ui/src');
    config.resolve.alias['@'] = path.resolve(__dirname, '.');
    return config;
  },
};

module.exports = nextConfig;

