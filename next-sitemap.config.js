/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://xiaozhaomiao.cn', // 这里应该配置你的实际域名
  generateRobotsTxt: true, // 自动生成robots.txt
  exclude: ['/api/*', '/auth/*', '/orders/*', '/sentry-test'], // 排除不需要索引的路径
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', allow: '/exam' },
      { userAgent: '*', allow: '/progress' },
      { userAgent: '*', allow: '/vip' },
      { userAgent: '*', allow: '/invite' },
      { userAgent: '*', disallow: '/api/' },
      { userAgent: '*', disallow: '/auth/' },
      { userAgent: '*', disallow: '/orders/' },
      { userAgent: '*', disallow: '/sentry-test' },
      { userAgent: '*', disallow: '/_next/' },
      { userAgent: '*', disallow: '/static/' },
    ],
  },
  changefreq: 'daily', // 页面更新频率
  priority: 0.7, // 默认优先级
  sitemapBaseFileName: 'sitemap',
  generateIndexSitemap: true, // 生成索引站点地图
};
