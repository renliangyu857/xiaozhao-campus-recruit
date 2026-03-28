import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '投递进度管理 - 校招喵',
  description: '校招喵投递进度管理看板，实时掌握校招投递进度，科学规划每一步，数据可视化分析，助力你高效备战校招',
  keywords: ['校招进度管理', '投递看板', '校招追踪', '求职进度', '校招数据', 'Offer率统计', '2026校招'],
  openGraph: {
    title: '我的投递看板 - 校招喵',
    description: '校招喵帮你实时掌握进度，科学规划每一步',
    url: 'https://xiaozhaomiao.cn/progress',
    siteName: '校招喵',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: 'https://xiaozhaomiao.cn/progress-og-image.jpg',
        width: 1200,
        height: 630,
        alt: '校招喵投递进度管理',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '我的投递看板 - 校招喵',
    description: '校招喵帮你实时掌握进度，科学规划每一步',
    creator: '@xiaozhaomiao',
    images: ['https://xiaozhaomiao.cn/progress-twitter-image.jpg'],
  },
};
