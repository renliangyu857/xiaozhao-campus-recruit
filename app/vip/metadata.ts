import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VIP会员购买 - 校招喵',
  description: '校招喵VIP会员，解锁无限校招查询、进度管理、内推码库、笔面试资料等全部高级功能，让求职之路更加顺畅',
  keywords: ['校招VIP', '会员购买', '校招特权', 'VIP权益', '无限查询', '内推码库', '2026校招'],
  openGraph: {
    title: '购买VIP，校招快人一步 - 校招喵',
    description: '无限查询 · 进度管理 · 内推码库 · 笔面试资料，让求职之路更加顺畅',
    url: 'https://xiaozhaomiao.cn/vip',
    siteName: '校招喵',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: 'https://xiaozhaomiao.cn/vip-og-image.jpg',
        width: 1200,
        height: 630,
        alt: '校招喵VIP会员',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '购买VIP，校招快人一步 - 校招喵',
    description: '无限查询 · 进度管理 · 内推码库 · 笔面试资料，让求职之路更加顺畅',
    creator: '@xiaozhaomiao',
    images: ['https://xiaozhaomiao.cn/vip-twitter-image.jpg'],
  },
};
