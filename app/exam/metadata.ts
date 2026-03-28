import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '笔面试资料库 - 校招喵',
  description: '校招喵笔面试资料库，提供80000+份真实校招笔面试资料，包括真题解析、面经分享、求职攻略等，助力你拿下心仪Offer',
  keywords: ['校招笔面试', '笔面试资料', '校招真题', '面经分享', '求职攻略', '2026校招', '实习资料'],
  openGraph: {
    title: '校招喵笔面试资料库',
    description: '全网笔面试资料聚合，真实文件名与路径，一键前往网盘下载',
    url: 'https://xiaozhaomiao.cn/exam',
    siteName: '校招喵',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: 'https://xiaozhaomiao.cn/exam-og-image.jpg',
        width: 1200,
        height: 630,
        alt: '校招喵笔面试资料库',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '校招喵笔面试资料库',
    description: '全网笔面试资料聚合，真实文件名与路径，一键前往网盘下载',
    creator: '@xiaozhaomiao',
    images: ['https://xiaozhaomiao.cn/exam-twitter-image.jpg'],
  },
};
