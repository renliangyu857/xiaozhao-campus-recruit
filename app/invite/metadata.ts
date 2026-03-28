import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '邀请好友 - 校招喵',
  description: '邀请好友使用校招喵，获取专属邀请码，享受更多校招服务权益',
  keywords: ['校招邀请', '邀请好友', '邀请码', '校招权益', '推荐好友', '校园招聘'],
  openGraph: {
    title: '邀请好友 - 校招喵',
    description: '邀请好友使用校招喵，获取专属邀请码，享受更多校招服务权益',
    url: 'https://xiaozhaomiao.cn/invite',
    siteName: '校招喵',
    locale: 'zh_CN',
    type: 'website',
    images: [
      {
        url: 'https://xiaozhaomiao.cn/invite-og-image.jpg',
        width: 1200,
        height: 630,
        alt: '校招喵邀请好友',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '邀请好友 - 校招喵',
    description: '邀请好友使用校招喵，获取专属邀请码，享受更多校招服务权益',
    creator: '@xiaozhaomiao',
    images: ['https://xiaozhaomiao.cn/invite-twitter-image.jpg'],
  },
};
