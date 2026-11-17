// 배포 도메인 (astro.config.mjs의 site와 일치시킬 것)
export const SITE_URL = 'https://jiwon-seok.com';

export const siteConfig = {
  url: SITE_URL,
  title: "BestOW's Blog",
  // 첫 화면 소개·meta description·RSS 설명 — 무엇을 다루는 블로그인지 드러나게
  description: '프론트엔드·웹 접근성·디자인 시스템을 만들며 직접 확인한 것을 기록합니다.',
  author: 'BestOW',
  locale: 'ko-KR',
  postsPerPage: 10,
  // 검색엔진 소유확인 메타태그. 값이 있을 때만 <head>에 렌더된다(빈 값이면 미출력).
  // naver: 네이버 서치어드바이저 HTML 태그 인증 코드.
  // google: GSC는 도메인 속성(DNS TXT)으로 인증했으므로 보통 비워둔다(URL 접두어 인증 시에만 사용).
  verification: {
    naver: '6c4fdc94944c1b11bf151f72676d4594462a0660',
    google: '',
  },
  // 메뉴 글자는 한국어(본문·첫 화면과 통일). hideOnMobile: 로고가 이미 홈 링크라 모바일에선 '홈' 중복 제거.
  // icon: 관습적으로 아이콘으로 노출하는 항목(Search/RSS) → 좁은 화면 공간 절약.
  nav: [
    { label: '홈', href: '/', hideOnMobile: true },
    { label: '태그', href: '/tags' },
    { label: '시리즈', href: '/series' },
    { label: '소개', href: '/about/', hideOnMobile: true }, // 모바일은 바닥글 링크로(머리글이 넘쳐 로고가 두 줄이 됨)
    { label: '검색', href: '/search', icon: 'search' },
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
  // 광고. 값이 비어 있으면 광고 스크립트·광고 칸을 전혀 그리지 않는다(giscus 와 같은 방식).
  // 자세한 순서는 docs/ADS.md.
  ads: {
    // Google AdSense 게시자 ID('ca-pub-…'). 채우면 모든 쪽 <head> 에 소유 확인 메타·광고 스크립트, ads.txt 에 한 줄이 들어간다.
    adsenseClient: 'ca-pub-4626981547175651' as string,
    // AdSense 수동 광고 단위 ID(숫자). 채우면 글 끝 광고 칸에 그 광고를 넣는다(비우면 자동 광고만).
    adsenseSlot: '' as string,
    // 카카오 애드핏 광고 단위('DAN-…'). AdSense 광고 단위가 없을 때 글 끝 광고 칸에 넣는다.
    adfitUnit: '' as string,
    adfitWidth: 320,
    adfitHeight: 100,
  },
  // 개인정보처리방침의 문의처(공개 저장소 이슈)
  contactUrl: 'https://github.com/Dev-BestOW/astro-blog/issues',
} as const;
