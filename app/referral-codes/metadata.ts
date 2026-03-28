import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '名企内推码库 - 校招喵',
  description: '校招喵名企内推码库，提供各行业名企内推码，助力你快速获得面试机会',
  keywords: ['内推码', '校招内推', '名企内推', '内推码库', '校园招聘', '2026校招'],
  openGraph: {
    title: '名企内推码库 - 校招喵',
    description: '校招喵名企内推码库，提供各行业名企内推码，助力你快速获得面试机会',
    url: 'https://xiaozhaomiao.cn/referral-codes',
    siteName: '校招喵',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: 'https://xiaozhaomiao.cn/referral-codes-og-image.jpg',
        width: 1200,
        height: 630,
        alt: '校招喵内推码库',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '名企内推码库 - 校招喵',
    description: '校招喵名企内推码库，提供各行业名企内推码，助力你快速获得面试机会',
    creator: '@xiaozhaomiao',
    images: ['https://xiaozhaomiao.cn/referral-codes-twitter-image.jpg'],
  },
};
