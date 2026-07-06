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
    { label: 'Series', href: '/series' },
    { label: 'Search', href: '/search' },
    { label: 'RSS', href: '/rss.xml' },
  ],
  // giscus 댓글 (GitHub Discussions 기반).
  // repoId·categoryId는 https://giscus.app 에서 레포 입력 시 발급되는 값을 채운다.
  // 둘 다 비어 있으면 Comments 컴포넌트는 렌더되지 않는다(프로덕션 안전).
  giscus: {
    repo: 'Dev-BestOW/astro-blog',
    repoId: '', // TODO: giscus.app에서 발급받아 채우기
    category: 'Announcements', // Discussions 카테고리 이름
    categoryId: '', // TODO: giscus.app에서 발급받아 채우기
    mapping: 'pathname',
    reactionsEnabled: '1',
    inputPosition: 'top',
    lang: 'ko',
  },
} as const;
