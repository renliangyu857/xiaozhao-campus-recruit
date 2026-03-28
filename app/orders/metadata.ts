import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '我的订单 - 校招喵',
  description: '校招喵订单管理中心，查看和管理你的会员购买、资料购买等所有订单',
  keywords: ['我的订单', '订单管理', '会员订单', '资料购买', '校招服务', '支付记录'],
  openGraph: {
    title: '我的订单 - 校招喵',
    description: '校招喵订单管理中心，查看和管理你的会员购买、资料购买等所有订单',
    url: 'https://xiaozhaomiao.cn/orders',
    siteName: '校招喵',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: 'https://xiaozhaomiao.cn/orders-og-image.jpg',
        width: 1200,
        height: 630,
        alt: '校招喵我的订单',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '我的订单 - 校招喵',
    description: '校招喵订单管理中心，查看和管理你的会员购买、资料购买等所有订单',
    creator: '@xiaozhaomiao',
    images: ['https://xiaozhaomiao.cn/orders-twitter-image.jpg'],
  },
};
