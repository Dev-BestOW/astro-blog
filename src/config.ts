// 배포 도메인 (astro.config.mjs의 site와 일치시킬 것)
export const SITE_URL = 'https://astro-blog.dev-bestow.workers.dev';

export const siteConfig = {
  url: SITE_URL,
  title: 'Dev Blog',
  description: '개발하면서 배운 것들을 기록하는 블로그',
  author: 'mayday',
  locale: 'ko-KR',
  postsPerPage: 10,
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Tags', href: '/tags' },
    { label: 'Search', href: '/search' },
    { label: 'RSS', href: '/rss.xml' },
  ],
} as const;
