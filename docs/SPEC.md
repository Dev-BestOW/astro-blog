# Astro 개발 블로그 — 프로젝트 스펙 (v1)

> 이 문서는 프로젝트의 단일 기준(Single Source of Truth)입니다.
> 모든 작업은 이 스펙을 먼저 참고한 뒤 진행합니다. 결정이 바뀌면 이 문서를 갱신합니다.
> v1 이후 남은 작업의 실행 백로그는 [ROADMAP.md](./ROADMAP.md) 참고.

- **작성일**: 2026-07-06
- **상태**: 확정 (v1 / MVP)
- **런타임**: Node 25, pnpm 10

---

## 1. 핵심 결정 사항

| 항목     | 결정                                   | 비고                                                                          |
| -------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| 배포     | **Cloudflare (Git 연동)**              | 정적 SSG, main push 시 자동 배포                                              |
| 배포 URL | **https://jiwon-seok.com**             | Cloudflare Registrar 커스텀 도메인(apex), GitHub `Dev-BestOW/astro-blog` 연동 |
| 렌더링   | **완전 정적 (SSG)** `output: 'static'` | 어댑터 불필요                                                                 |
| UI 방향  | **미니멀**                             | 타이포/여백 중심, 다크모드                                                    |
| 인터랙션 | **순수 Astro (프레임워크 없음)**       | 필요 시 순수 `<script>`만 사용                                                |

---

## 2. 기술 스택

| 영역            | 선택                                                     |
| --------------- | -------------------------------------------------------- |
| 프레임워크      | Astro 5.x                                                |
| 언어            | TypeScript (strict)                                      |
| 콘텐츠          | Content Collections + MDX                                |
| 스타일          | Tailwind CSS v4 (`@tailwindcss/vite`)                    |
| 코드 하이라이팅 | Shiki (Astro 내장, 빌드타임)                             |
| 이미지          | `astro:assets` (빌드타임 최적화)                         |
| 피드/사이트맵   | `@astrojs/rss`, `@astrojs/sitemap`                       |
| OG 이미지       | satori + @resvg/resvg-js (빌드타임 PNG, Pretendard 폰트) |
| 패키지 매니저   | pnpm                                                     |

**원칙:** 클라이언트 JS 페이로드 최소화. 다크모드 토글·TOC 스크롤 하이라이트만 수 줄의 순수 스크립트로 처리.

---

## 3. 기능 범위

### MVP (v1)

- [ ] 글 목록 / 상세 페이지 (`/`, `/posts/[slug]`)
- [ ] 태그 분류 (`/tags`, `/tags/[tag]`)
- [ ] Markdown / MDX 작성 (코드블록, 이미지 최적화)
- [ ] 목차(TOC) 자동 생성
- [ ] 읽기 시간 표시
- [ ] 다크모드 토글
- [ ] RSS 피드 (`/rss.xml`)
- [ ] 사이트맵
- [ ] SEO: OpenGraph 메타 + OG 이미지 자동 생성
- [ ] 반응형 + 접근성(시맨틱 HTML, 키보드 내비)

### 백로그 (v2)

- [x] 검색 (Pagefind — 정적 클라이언트 검색, CF Pages와 궁합 좋음) ✅
- [x] 댓글 (giscus) ✅
- [x] 시리즈/연재 그룹핑 ✅
- [ ] 다국어(i18n)
- [ ] 조회수

---

## 4. 디렉터리 구조

```
src/
  content/
    posts/           # .md / .mdx 글
    config.ts        # 컬렉션 스키마(zod)
  components/         # PostCard, TOC, ThemeToggle ...
  layouts/           # BaseLayout, PostLayout
  pages/
    index.astro
    posts/[...slug].astro
    tags/index.astro
    tags/[tag].astro
    rss.xml.ts
  styles/
public/               # 폰트, 파비콘, 정적 이미지
docs/
  SPEC.md             # 이 문서
astro.config.mjs
```

---

## 5. 콘텐츠 스키마 (프론트매터)

```ts
// src/content.config.ts
title: string
description: string
pubDate: Date
updatedDate?: Date
tags: string[]
draft: boolean = false        // true면 빌드에서 제외
heroImage?: image()
series?: string               // 연재 이름. 같은 값끼리 /series/[name]으로 묶임
seriesOrder?: number          // 시리즈 내 순서(오름차순). 없으면 pubDate 오름차순
```

- **시리즈**: `series`가 같은 글끼리 하나의 연재로 묶인다. 순서는 `seriesOrder`(오름차순) → 동률/미지정 시 `pubDate`(오름차순, 1편이 먼저). `/series`(전체 목록)·`/series/[name]`(연재 상세)에서 탐색하고, 글 상세 상단엔 연재 목차(현재 편 강조)와 하단 이전/다음 편 이동을 제공한다.
- **heroImage / OG 정책**: `heroImage`는 **본문 상단 표시 전용**. 소셜 미리보기(OG)는 `heroImage` 유무와 무관하게 **satori 생성 PNG로 통일**(브랜드 일관성·항상 1200×630 보장). heroImage를 OG로 대체하려면 `BaseLayout`의 `image` prop만 조건부로 바꾸면 됨(소규모).

---

## 6. 품질 / 운영

- ESLint + Prettier ✅ (`pnpm lint`/`format`)
- `astro check` (타입 검사)
- GitHub Actions CI ✅: PR·비-main push에서 `check`+`lint`+`format:check`+`build` (`.github/workflows/ci.yml`)
- Lighthouse 목표: Performance / SEO / Accessibility **95+**

### 배포 파이프라인

1. 로컬 `pnpm build` → `dist/` 정적 산출물
2. Cloudflare Pages에 GitHub 레포 연결
   - 빌드 명령: `pnpm build`
   - 출력 디렉터리: `dist`
   - 자동 프리뷰(PR) / 프로덕션(main) 배포

---

## 7. 마일스톤

| 단계            | 내용                                                                | 상태                                                               |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **M1 스캐폴딩** | 프로젝트 생성, Tailwind/MDX/컬렉션 스키마, 레이아웃 골격            | ✅                                                                 |
| **M2 콘텐츠**   | 목록/상세/태그 페이지, TOC, 읽기시간, 코드 하이라이팅, 페이지네이션 | ✅                                                                 |
| **M3 SEO/피드** | RSS, 사이트맵, OG 이미지, 다크모드                                  | ✅ (RSS·사이트맵·다크모드·OG메타 + satori OG 이미지 자동생성 완료) |
| **M4 배포**     | Cloudflare 연결, Lighthouse 95+ 확인                                | ✅ (A11y·SEO·BestPractices 100, LCP 130ms/CLS 0)                   |
| **v2 백로그**   | Pagefind 검색, giscus 댓글, 시리즈                                  | ⬜                                                                 |

---

## 변경 이력

- 2026-07-06: 글 목록 카드(`PostCard`) 메타 행 반응형화. 모바일에서 발행일과 태그를 세로 스택(`flex-col gap-1`), `sm`+에서 기존처럼 한 줄(`sm:flex-row sm:items-center sm:gap-3`). 브라우저 실측(375px 줄바꿈·1024px 한 줄) 및 `check`/`build` 통과.
- 2026-07-06: 예약 발행(매일 1편) 자동화. `content-queue/`(콘텐츠 컬렉션 밖 → 대기 글은 빌드 미포함)에 미리 쓴 글을 쌓아두면 `scripts/publish-next.mjs`가 파일명 오름차순으로 다음 1편을 `src/content/posts/`로 이동(선행 `NN-` 접두어는 slug에서 제거, `pubDate`는 발행일 KST로 자동 갱신, 파일명 충돌·프론트매터 부재 시 중단). `.github/workflows/daily-post.yml`이 매일 00:00 UTC(=09:00 KST) 크론+`workflow_dispatch`로 실행→변경 있으면 `github-actions[bot]`이 main에 commit&push→Cloudflare 자동 배포. 큐가 비면 무커밋. 로컬 실측(빈 큐 무동작·발행 시 접두어 제거+pubDate 갱신+큐 제거). 기존 `ci.yml`은 main push 제외라 충돌 없음.
- 2026-07-06: 검색엔진 소유확인 메타 배선. `siteConfig.verification.{naver,google}` 필드 추가, `BaseLayout` `<head>`에 값이 있을 때만 렌더(빈 값 미출력 안전장치). 네이버 서치어드바이저 인증코드 채움(google은 GSC 도메인 속성=DNS TXT로 인증했으므로 공란). GSC: 도메인 속성 DNS TXT 인증 완료 + `sitemap-index.xml` 제출 완료. build로 홈 head 렌더 검증.
- 2026-07-06: 커스텀 도메인 전환 `jiwon-seok.com`(Cloudflare Registrar, apex). Cloudflare Worker에 커스텀 도메인 연결 + 예전 `*.workers.dev` 라우트 비활성(중복 콘텐츠 방지). `SITE_URL`을 `src/config.ts`·`astro.config.mjs` 두 곳에서 교체(`wrangler.jsonc`엔 URL 필드 없음—dashboard 커스텀 도메인 방식이라 무변경, 지뢰 회피). canonical·OG·사이트맵·RSS·robots·JSON-LD가 전부 새 도메인 기준으로 자동 재생성됨을 build로 확인. CLAUDE.md·SPEC 라이브 URL 갱신. 후속: GSC(도메인 속성/DNS 인증)·네이버 서치어드바이저 등록 예정.
- 2026-07-06: 디자인·UX 개선 D1–D6 일괄 반영(ROADMAP 디자인 섹션). **D1** 본문 웹폰트 self-host — Pretendard Variable을 상용 글자로 서브셋한 단일 woff2(0.63MB, 전 weight)를 `@font-face`+`@theme --font-sans`로 전 페이지 적용(생성 `scripts/subset-body-font.mjs`, 원본 devDep `pretendard`; 희귀 음절은 시스템 폰트 폴백→두부 0). OG용 `Pretendard-*.subset.woff`(정적 400/700)와는 별개. **D2** 브랜드 accent 토큰화 — `--accent`(인디고, 라이트#4f46e5/다크#818cf8)+Tailwind `@theme --color-accent`로 `text-accent` 통일, 순정 blue-600/blue-400 및 `dark:` 변형 전면 제거(Pagefind primary 포함). **D3** sticky 사이드바 TOC — xl+에서 `.toc-floating`을 본문 우측 여백에 `fixed`(TOC 인스턴스 1개 유지, 하이라이트는 `[data-toc-link].is-active`). **D4** 홈 히어로(1페이지 사이트 소개, 목록 heading h2 강등). **D5** 헤더 반응형(config `hideOnMobile`/`icon` 플래그, Home 모바일 숨김·Search/RSS 아이콘화) + 전역 `:focus-visible` accent 링. **D6** 코드블록 언어 라벨+복사 버튼(shiki transformer `data-language` + `PostLayout` 클라이언트 스크립트). `pnpm check` 0/0/0·lint 0·format clean, 라이트/다크·데스크톱/모바일 브라우저 육안 검증. 지뢰: 본문 폰트 `PretendardVariable.subset.woff2`도 삭제 금지(CLAUDE.md 갱신).
- 2026-07-06: 글 추가 "MPA가 다시 빨라진다 — View Transitions와 '적게 보내기'의 귀환"(`posts/2026-view-transitions-baseline.md`). 2026 프론트엔드 이슈(View Transitions Baseline·RSC·Signals) 정리, 블로그 스택 철학과 연결. 겸사겸사 `search.astro`의 `<link is:inline>` 타입 에러(`ts(2322)`) 수정 — `<link>`엔 `is:inline`이 불필요(정적 `/pagefind/*` 경로는 미변환), 제거해 `pnpm check` 0 errors 복구. build로 글 산출·검색 CSS 경로 유지 확인.
- 2026-07-06: heroImage/OG 정책 확정(ROADMAP 기술부채 B). OG는 생성 PNG로 통일, heroImage는 본문 상단 표시 전용(코드 변경 없음, 정책 문서화). 5장에 정책 명시.
- 2026-07-06: OG 폰트 서브셋(ROADMAP 기술부채 A). Pretendard OTF(3.15MB)를 현대 한글 음절 전체+라틴/자모/구두점만 남긴 서브셋 WOFF(1.7MB, -44%)로 교체, satori가 WOFF 직접 로드. 원본 OTF는 커밋 제외(`.gitignore`), 재생성 `scripts/subset-fonts.mjs`. `src/lib/og.ts`가 `Pretendard-*.subset.woff` 참조. CLAUDE.md 지뢰 노트도 갱신(OTF→WOFF). 프로덕션 OG 육안 검증(두부 0).
- 2026-07-06: giscus 댓글 활성화(ROADMAP P2-6 완료). `siteConfig.giscus`에 `repoId`(R_kgDOTOsu_A)·`categoryId`(DIC_kwDOTOsu_M4DAmFs, `Announcements`) 채움, `inputPosition: bottom`. 브라우저 실측으로 iframe 로드·댓글 표시·다크↔라이트 테마 동기화 확인. (config 값을 비우면 inert 가드로 자동 비활성 — 안전장치 유지)
- 2026-07-06: giscus 댓글 스캐폴딩(ROADMAP P2-6). `Comments.astro`(`siteConfig.giscus` config 기반, `PostLayout` 하단, 다크모드 `MutationObserver` 테마 동기화, `pathname` 매핑, ko, lazy). `repoId`/`categoryId` 미설정 시 프로덕션 렌더 안 함(inert 가드)·개발 모드 안내만.
- 2026-07-06: 시리즈/연재 그룹핑 추가(ROADMAP P2-7). 스키마에 `series`/`seriesOrder`(5장 선행 갱신). `utils/posts.ts`에 `getAllSeries`/`getSeriesPosts`/`getSeriesContext`(정렬 seriesOrder↑→pubDate↑). `/series`·`/series/[name]` 페이지, `SeriesNav` 컴포넌트(글 상단 목차·현재 편 강조·pagefind 제외)+하단 이전/다음 편, nav에 Series. 시리즈 URL은 태그와 동일하게 원본 이름(공백·한글 인코딩). 임시 3편으로 실측 후 원복(빈 상태 확인).
- 2026-07-06: Pagefind 정적 검색 추가(ROADMAP P2-5). `build`에 `pagefind --site dist` 체이닝. `PostLayout` article에 `data-pagefind-body`(글만 인덱싱)·TOC엔 `data-pagefind-ignore`, 프론트매터 `description`을 제목 하단 subtitle로 렌더해 인덱싱 포함. `/search` 페이지(Pagefind Default UI, 한글 번역·다크모드 변수), nav에 Search. 인덱스 = 제목+본문+태그+설명. 브라우저 실측(한글 접두 부분일치·설명 매칭·콘솔 에러 0). 한계: 한글 stemming 미지원, `astro dev`에선 검색 비활성(빌드 후 `preview` 필요).
- 2026-07-06: JSON-LD 구조화 데이터 추가(ROADMAP P1-4). `BaseLayout`에 `jsonLd` prop(`<`→`<` 이스케이프 + `is:inline`으로 안전 주입). 홈(`/`)은 `WebSite`, 글 상세는 `PostLayout`에서 `BlogPosting`(headline·description·datePublished·dateModified·author·publisher·image(생성 OG)·mainEntityOfPage·keywords·inLanguage). 그 외 website 페이지엔 미출력(중복 방지). 빌드 산출물 home=1/post=1/tags=0 및 JSON 유효성 검증.
- 2026-07-06: robots.txt 추가(ROADMAP P1-3). `src/pages/robots.txt.ts`에서 `siteConfig.url` 기반 동적 생성(도메인 변경 자동 반영). `User-agent: * / Allow: /` + `Sitemap: …/sitemap-index.xml`(절대 URL). `dist/robots.txt` 산출 확인.
- 2026-07-06: GitHub Actions CI 도입(ROADMAP P1-2). `.github/workflows/ci.yml` — 단일 `verify` 잡에서 `pnpm/action-setup`(packageManager의 pnpm 10)+`setup-node`(`.nvmrc`=22, pnpm 캐시) → `install --frozen-lockfile` → `check`/`lint`/`format:check`/`build`. 트리거 `pull_request`+`push`(main 제외; main은 Cloudflare 담당), `concurrency`로 중복 실행 취소. 타입 오류 주입 시 `pnpm check` exit 1로 게이트 red 동작 로컬 확인.
- 2026-07-06: ESLint + Prettier 도입(ROADMAP P1-1). flat config `eslint.config.js`(`eslint/config`의 `defineConfig`+`typescript-eslint`+`eslint-plugin-astro` recommended), `.prettierrc.json`(singleQuote·printWidth 100·trailingComma all·`prettier-plugin-astro`), `.prettierignore` 추가. `package.json`에 `lint`/`lint:fix`/`format`/`format:check` 스크립트. 전체 소스 포맷·린트 통과, `astro check` 0 errors, build 성공. (`readingTimeMinutes`의 정규식 불필요 이스케이프 `\-` 정리)
- 2026-07-06: 페이지네이션 구현(M2 완결). `src/pages/[...page].astro`에서 Astro `paginate()`로 page 1=`/`, 이후 `/2`,`/3` 생성(pageSize=`siteConfig.postsPerPage`=10). `Pagination.astro`(이전/다음/카운터, 1페이지면 숨김) 추가. 임시 글 2개+pageSize 1로 다중 페이지 생성·네비 검증 후 원복.
- 2026-07-06: v1 스펙 확정 (Cloudflare Pages / 미니멀 UI / 순수 Astro).
- 2026-07-06: M1 스캐폴딩 완료. Astro 7 + Tailwind v4 + MDX + Content Collections(glob loader) 구성. 목록/상세/태그/RSS/사이트맵/다크모드/OG메타/404 페이지 구현, `astro check` 0 errors, `pnpm build` 성공.
- 2026-07-06: M4 배포 연결 완료. Cloudflare Git 연동, main push 시 자동 재배포 검증(~84초). 배포 URL을 workers.dev 도메인으로 확정하고 canonical/OG/RSS/sitemap 전부 반영. `.nvmrc`(22)·`packageManager` 고정.
- 2026-07-06: Lighthouse 측정 및 접근성 수정. muted 텍스트 대비(neutral-500 on dark = 4.17)가 WCAG AA 미달 → neutral-600/dark:neutral-400로 상향. 재측정 결과 Accessibility·SEO·Best Practices·Agentic 100/0-failed, 성능 LCP 130ms·CLS 0.00·TTFB 58ms. M4 완료.
- 2026-07-06: 배포 실패 수정. wrangler가 wrangler 설정 부재 시 `astro add cloudflare` 어댑터를 자동 주입 → workerd 프리렌더에서 `node:fs` 없음으로 OG 빌드 실패. 정적 assets 배포용 `wrangler.jsonc`(assets.directory=./dist, main 없음)를 추가해 자동설정을 차단, 플레인 static 산출물을 그대로 배포하도록 고정.
- 2026-07-06: OG 이미지 satori 자동생성 구현(M3 완결). `src/lib/og.ts` + `src/pages/og/[...slug].png.ts`로 글별 1200x630 PNG 빌드타임 생성, 사이트 기본 OG 포함. 한글 렌더용 Pretendard(Bold/Regular) OTF 벤더링(`src/assets/fonts/`). 레이아웃이 생성 PNG 참조, og:image width/height 메타 추가, 기존 SVG placeholder 제거.
