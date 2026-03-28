import type { Metadata } from 'next';

interface ContactPoint {
  '@type': string;
  contactType: string;
  availableLanguage: string;
}

interface Organization {
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
  contactPoint: ContactPoint;
}

interface SearchAction {
  '@type': string;
  target: string;
  'query-input': string;
}

interface WebSite {
  name: string;
  url: string;
  description: string;
  publisher: Organization;
  potentialAction: SearchAction;
}

interface Offer {
  '@type': string;
  name: string;
  price: string;
  priceCurrency: string;
}

interface AggregateOffer {
  '@type': string;
  priceCurrency: string;
  offers: Offer[];
}

interface Product {
  name: string;
  description: string;
  brand: Organization;
  image?: string;
  category?: string;
  offers: AggregateOffer;
  aggregateRating?: {
    '@type': string;
    ratingValue: string;
    reviewCount: string;
  };
}

// 网站组织信息
const ORGANIZATION_DATA: Organization = {
  name: '校招喵',
  url: 'https://xiaozhaomiao.cn',
  logo: 'https://xiaozhaomiao.cn/icon.png',
  sameAs: [
    'https://weixin.qq.com/campusrecruit_cat',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Chinese',
  },
};

// 网站信息
const WEBSITE_DATA: WebSite = {
  name: '校招喵 - 你的校招助手',
  url: 'https://xiaozhaomiao.cn',
  description: '校招信息聚合、投递进度管理、内推码库，一站式助你拿下心仪Offer',
  publisher: ORGANIZATION_DATA,
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://xiaozhaomiao.cn/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

// VIP产品信息
const VIP_PRODUCT_DATA: Product = {
  name: '校招喵VIP会员',
  description: '解锁无限校招查询、进度管理、内推码库、笔面试资料等全部高级功能，一站式助你拿下心仪Offer',
  brand: ORGANIZATION_DATA,
  image: 'https://xiaozhaomiao.cn/vip-product-image.jpg',
  category: 'Software',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'CNY',
    offers: [
      {
        '@type': 'Offer',
        name: '1个月会员',
        description: '灵活体验，适合短期校招冲刺',
        price: '9.9',
        priceCurrency: 'CNY',
        priceValidUntil: '2026-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: '3个月会员',
        description: '最受欢迎，适合完整校招季',
        price: '19.9',
        priceCurrency: 'CNY',
        priceValidUntil: '2026-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: '年度会员',
        description: '超值之选，涵盖全年校招周期',
        price: '49.9',
        priceCurrency: 'CNY',
        priceValidUntil: '2026-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        availability: 'https://schema.org/InStock',
      },
    ],
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1289',
  },
};

export function getOrganizationMetadata(): Metadata {
  return {
    metadataBase: new URL('https://xiaozhaomiao.cn'),
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      siteName: '校招喵',
    },
  };
}

export { ORGANIZATION_DATA, WEBSITE_DATA, VIP_PRODUCT_DATA };
