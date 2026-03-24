import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  // 图片优化配置
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    // 远程图片域名配置（用于服务号二维码等）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.qpic.cn',
      },
      {
        protocol: 'https',
        hostname: '**.weixin.qq.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
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

// 导出配置
export default nextConfig;
