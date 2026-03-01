import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  // 图片优化配置
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // 实验性功能优化
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // 跨域配置：生产环境使用 ALLOWED_ORIGINS，开发默认允许 *
  async headers() {
    const origins = process.env.ALLOWED_ORIGINS?.trim();
    const allowOrigin = process.env.NODE_ENV === "production" && origins
      ? origins.split(",").map((o) => o.trim()).filter(Boolean)[0] ?? "*"
      : "*";
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },

  // 重定向配置（可选）
  async redirects() {
    return [];
  },
};

// Sentry 配置
const sentryWebpackPluginOptions = {
  // Sentry 组织信息
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // 仅在 CI 环境静默
  silent: !process.env.CI,

  // 上传更广泛的客户端文件
  widenClientFileUpload: true,

  // 通过隧道路由绕过广告拦截器
  tunnelRoute: '/monitoring-tunnel',

  // 隐藏 source maps
  hideSourceMaps: true,

  // 禁用 logger
  disableLogger: true,

  // 自动检测 Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// 导出配置（带 Sentry）
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
