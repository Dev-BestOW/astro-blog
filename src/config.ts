// 배포 도메인 (astro.config.mjs의 site와 일치시킬 것)
export const SITE_URL = 'https://astro-blog.dev-bestow.workers.dev';

export const siteConfig = {
  url: SITE_URL,
  title: 'BestOW Blog',
  description: '나를 기록하는 블로그',
  author: 'BestOW',
  locale: 'ko-KR',
  postsPerPage: 10,
  // hideOnMobile: 로고가 이미 홈 링크라 모바일에선 'Home' 중복 제거.
  // icon: 관습적으로 아이콘으로 노출하는 항목(Search/RSS) → 좁은 화면 공간 절약.
  nav: [
    { label: 'Home', href: '/', hideOnMobile: true },
    { label: 'Tags', href: '/tags' },
    { label: 'Series', href: '/series' },
    { label: 'Search', href: '/search', icon: 'search' },
    { label: 'RSS', href: '/rss.xml', icon: 'rss' },
  ],
  // giscus 댓글 (GitHub Discussions 기반).
  // repoId·categoryId는 https://giscus.app 또는 GitHub GraphQL에서 얻는다.
  // 둘 다 비어 있으면 Comments 컴포넌트는 렌더되지 않는다(프로덕션 안전).
  giscus: {
    repo: 'Dev-BestOW/astro-blog',
    repoId: 'R_kgDOTOsu_A',
    category: 'Announcements', // 유지관리자만 생성 가능 → giscus 앱이 대신 생성(스팸 방지)
    categoryId: 'DIC_kwDOTOsu_M4DAmFs',
    mapping: 'pathname',
    reactionsEnabled: '1',
    inputPosition: 'bottom',
    lang: 'ko',
  },
} as const;
