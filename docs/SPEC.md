# Astro 개발 블로그 — 프로젝트 스펙 (v1)

> 이 문서는 프로젝트의 단일 기준(Single Source of Truth)입니다.
> 모든 작업은 이 스펙을 먼저 참고한 뒤 진행합니다. 결정이 바뀌면 이 문서를 갱신합니다.
> v1 이후 남은 작업의 실행 백로그는 [ROADMAP.md](./ROADMAP.md) 참고.

- **작성일**: 2026-07-06
- **상태**: 확정 (v1 / MVP)
- **런타임**: Node 25, pnpm 10

---

## 1. 핵심 결정 사항

| 항목     | 결정                                   | 비고                                                                                                                                                                                                     |
| -------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 배포     | **Cloudflare (Git 연동)**              | 정적 SSG, main push 시 자동 배포                                                                                                                                                                         |
| 배포 URL | **https://jiwon-seok.com**             | Cloudflare Registrar 커스텀 도메인(apex), GitHub `Dev-BestOW/astro-blog` 연동                                                                                                                            |
| 렌더링   | **완전 정적 (SSG)** `output: 'static'` | 어댑터 불필요                                                                                                                                                                                            |
| UI 방향  | **미니멀**                             | 타이포/여백 중심, 다크모드                                                                                                                                                                               |
| 인터랙션 | **순수 Astro (프레임워크 없음)**       | 필요 시 순수 `<script>`만 사용                                                                                                                                                                           |
| 쪽 전환  | **CSS 문서 간 View Transitions**       | `global.css` `@view-transition`(동작 줄이기면 끔)·머리글 `site-header` 이름. JS·`<ClientRouter />` 없음, 미지원 브라우저는 즉시 이동. 같은 `view-transition-name` 이 한 쪽에 둘이면 전환 전체가 취소된다 |

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
- `astro check` (타입 검사) + `scripts/check-meta.mjs`(글 제목 40·설명 80자 — 발행 글·대기열, 낱말 반복은 경고) — 둘 다 `pnpm check`
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

- 2026-11-25: IndexNow — 새 글 주소를 검색 엔진에 바로 알림(색인 보장 아님). 키 파일 `public/98a1af9fcf71704a5a83646e64a4ed3a.txt`(공개 값), `scripts/indexnow.mjs`(우리 도메인 주소만, 키 파일·각 주소가 200 이 될 때까지 최대 10분 기다린 뒤 네이버 `searchadvisor.naver.com/indexnow` 와 공용 `api.indexnow.org/indexnow` 에 POST, 200·202 성공·그 밖 실패, `--dry-run`). `daily-post.yml` 은 push 뒤 새로 생긴 글 파일에서 주소를 뽑아 알리고(`continue-on-error` — 알림 실패가 발행을 막지 않음), 손으로 알리는 `indexnow.yml`(workflow_dispatch, 주소 입력). 프로토콜·엔드포인트는 indexnow.org 문서·FAQ 로 확인(네이버 가이드는 이 환경에서 열리지 않음 — 네이버 엔드포인트는 IndexNow FAQ 기준). 로컬 시험: 주소 없음·다른 호스트·안 열리는 쪽은 실패, 미리보기 대상 dry-run 성공, 복제 저장소에서 발행 뒤 주소 뽑기 확인. 첫 실제 제출(수동 워크플로 run 45561591609, 11/25 보강한 10편): 키 파일·10개 쪽 모두 200 확인 뒤 네이버 **200**, api.indexnow.org **202**(키 확인 대기 — 첫 제출에 흔한 응답).
- 2026-11-25: 옛 주소 `astro-blog.dev-bestow.workers.dev` 끄기를 설정 파일로 — 11/17 대시보드에서 껐지만 11/25 확인 때 200 으로 사이트 전체가 열려 있었다(배포 때 다시 켜짐, canonical·사이트맵은 본 도메인이라 피해는 제한적). `wrangler.jsonc` 에 `"workers_dev": false`(사용자 승인, CLAUDE.md 지뢰 항목에 예외로 적음). `preview_urls` 는 적지 않음 — Cloudflare 문서상 생략하면 기존 버전 미리보기 설정을 바꾸지 않고, 브랜치·PR 미리보기는 별도 기능. `wrangler deploy --dry-run`(4.168.0) 경고 없이 통과. 배포(62e4861) 뒤 workers.dev `/`·글 쪽 404(error 1042), 본 도메인 200 확인.
- 2026-11-25: 본문 표 가로 넘침 — 빌드 때 `src/lib/rehype-table-wrap.mjs`(astro.config `markdown.rehypePlugins`, MDX 도 이어받음)가 모든 `<table>` 을 `<div class="table-wrap">`(`overflow-x: auto`)로 감싼다. 실제로 넘치는 상자에만 `PostLayout` 스크립트가 `tabindex=0`·`role=region`·`aria-label="표 N (가로로 스크롤)"` 을 붙이고, 상자와 표를 `ResizeObserver` 로 함께 봐서 폭이 바뀌거나 웹폰트가 늦게 와 표 폭이 줄면 다시 뗀다(처음엔 상자만 봐서 대체 글꼴 때 붙은 tabindex 가 남았음 — 글꼴 1.5초 지연으로 재현·확인). `business-number-checksum`(320px 에서 453px)·`screen-reader-live-region-timing`(346px) 쪽 넘침 0, 전체 글 320·390px 쪽 넘침 0. Tab 으로 상자 포커스·→ 키로 149px 스크롤, 1440px 에서는 tabindex 없음. axe(WCAG + best-practice) 위반 0 — 이름이 같으면 `landmark-unique` 이 나와 번호를 붙임. RSS 본문에도 같은 상자가 들어간다(스타일 없으면 그냥 div).
- 2026-11-25: 댓글 칸 "불러오는 중" 안내의 `GitHub Discussions` 링크에 늘 밑줄(`underline underline-offset-2`) — 문장 속 링크가 색으로만 구분돼 axe `link-in-text-block`(WCAG 1.4.1)이 모든 글에서 1건씩 나오던 것. giscus 를 막아 안내가 보이는 상태로 글 4편 × 1440·390 × 라이트·다크 axe 위반 0. 다른 `hover:underline` 링크(푸터·목록으로 등)는 문장 밖에 따로 놓여 해당 없음.
- 2026-11-25: 쪽 전환(문서 간 View Transitions) 켜기 + AdSense 대응 4단계. `global.css` 에 `@media (prefers-reduced-motion: no-preference) { @view-transition { navigation: auto } }`, 머리글 `.site-header` 에 `view-transition-name`(본문만 페이드). JS 0, CSS 126바이트. Playwright 로 `pagereveal` 의 `viewTransition` 확인 — Chrome 158·WebKit 27.2 전환 있음(기본 250ms, root·site-header 두 묶음), 동작 줄이기면 없음. Firefox 는 설치된 Playwright 빌드가 실행되지 않아 못 봄(MDN BCD: 문서 간 전환 preview). 다크 모드로 옮겨도 새 쪽 첫 표시 때 이미 dark, 첫 Tab 은 건너뛰기 링크. 첫 화면·글·소개 1440·390 × 라이트·다크 axe 위반 없음(기존 댓글 안내 링크 제외), 320px 넘침 0. 글 `2026-view-transitions-baseline` 을 트렌드 요약에서 적용 후기로 다시 씀(제목·설명 그대로, 외부 트렌드 기사 인용 삭제, 중복 이름 `InvalidStateError` 확인, `updatedDate` 2026-11-25).
- 2026-11-25: AdSense 대응 3단계 — 7월 글 5편에 직접 돌린 실험 결과를 더함(`updatedDate` 2026-11-25, 제목·설명 그대로, 환경 Apple M1·Node 22.23.4·Chrome 158·React 19.3.1). `abortcontroller`: 끊는 방법별 에러 이름(timeout·any 는 `TimeoutError`, `abort(reason)` 은 reason) — 글의 `name === 'AbortError'` 검사로는 타임아웃을 못 거른다는 것과 `signal.aborted` 패턴, 리스너 일괄 해제 3 → 0회, 이미 abort 된 signal 은 등록 안 됨. `structured-clone`: JSON 가능 데이터에서 **structuredClone 이 JSON 왕복보다 느림**(Node 약 1.2~~1.3배, Chrome 약 1.5~~1.8배) — 마무리 규칙을 "JSON 은 쓰지 마라" 에서 고침, 기존 결과 주석 확인. `event-loop-microtasks`: 마이크로태스크로 쪼갠 500ms 작업도 프레임 0·클릭은 작업 뒤(setTimeout 은 29~~30 프레임), **nextTick 이 ES 모듈 최상위에서는 Promise 뒤**(글의 "항상 먼저" 를 고침), "6년차" 삭제. `inp-core-web-vitals`: 300ms 핸들러 304~~320ms → 양보 1번 16ms 이하, 하지만 그 사이 두 번째 클릭 200~224ms, 30ms 씩 나누면 16ms 이하, "6년차" 삭제. `immutable-array-methods`: `prev.sort()` 는 다시 그리지 않다가 다른 상태가 바뀔 때 정렬된 채 나타남, 모듈 상수까지 바뀜. 글끼리 링크 추가. 320·390·1440px 가로 넘침 0(표를 좁게 다시 짬), axe 는 기존 댓글 안내 링크 1건뿐.
- 2026-11-25: AdSense 대응 2단계 — 7월 글 4편에 BestOW UI 실제 사례·직접 확인한 결과를 더함(`updatedDate` 2026-11-25, 제목·설명은 그대로). `css-has`: NativeSelect 의 `:has(option[value=""]:checked)` 와 `:invalid`(required 있을 때만) 비교(Chrome 158·Playwright). `container-queries`: Storybook 앱 뼈대 스토리가 창 크기와 상관없이 휴대폰 폭을 그리려고 `@container` 를 쓰는 이유. `typescript-satisfies`: 모호하던 `a.timeuot` 주석을 tsc 5.9.3 결과로 확정, 토큰 `darkShadow` 의 `as const satisfies` 키 검사(오류 코드 확인), "6년차" 문구 삭제. `closures-memory-leaks`: **"약 200MB" 를 재측정값 +38.1 MB 로 바로잡음**(Node 22.23.4, `--expose-gc`, 3회 같음) + 측정 코드·`useSystemTheme` 구독 해제 예. 글끼리 링크(css-has↔container-queries, closures→abortcontroller). 320·390px 가로 넘침 0. axe 는 네 글 모두 댓글 칸 "불러오는 중" 안내의 `GitHub Discussions` 링크 하나(`link-in-text-block`)만 — 손대지 않은 글에도 있는 기존 문제.
- 2026-11-25: AdSense 거절("가치가 별로 없는 콘텐츠") 대응 1단계 — 7월 짧은 글 12편을 검토해 2편은 내리고 10편은 보강하기로(판단표는 대화 기록). `hello-world`·`signals-reactivity` 를 `draft: true` 로, 옛 주소는 `public/_redirects`(Cloudflare 정적 자산 리디렉션)로 `/about/` 에 301.
- 2026-11-23: BestOW 글 21편 사실 확인(코드·설정·숫자를 저장소와 대조, 사업자번호 통계·OKLCH 대비·초성 검색 표는 빌드된 함수로 다시 계산, 구글 파비콘 형식은 원문 확인) — 틀린 내용은 없었고 4편 보강: `kwcag-automated-testing`(스토리 약 260 → 약 340개), `sms-otp-autofill-react`(WebOTP 는 컴포넌트에 없고 앱에서 붙인다), `css-layer-design-system-tailwind`(`!important` 는 레이어 순서가 뒤집힌다 — BestOW 는 reduced-motion 의 `animation: none` 에만 씀), 예약 `017`(SKILL.md 126줄은 0.5.0 기준). 발행 3편 `updatedDate` 2026-11-23. velog 원고도 같게 고침.
- 2026-11-23: 발행 글 `design-system-docs-seo-geo.md` 보강(`updatedDate` 2026-11-23) — 글을 쓴 뒤 BestOW UI 에서 바뀐 세 가지: Storybook `iframe.html` 이 Search Console "표준 없는 중복 페이지"로 잡혀 `noindex, indexifembedded` 를 넣은 일(추가 문단 + 코드), 첫 화면 JSON-LD 에 `WebSite`(사이트 이름), 날짜 문단 — 지금은 `fetch-depth: 0` 이지만 글이 데이터 파일 하나에 모여 있어 git 날짜로는 쪽별 수정일을 알 수 없어 상수로 둔 이유. velog 원고도 같게 고침.
- 2026-11-22: 예약 글 2편 추가(BestOW UI 만들기) — `018-korean-choseong-search.md`(한글 초성 검색: 음절 분해 588·28, 조합 중인 마지막 글자 규칙, korean-utils `hangul.ts` 코드·테스트 표 — 예시는 빌드된 함수로 확인)와 `019-solo-github-flow-ruleset.md`(1인 개발 GitHub Flow: ruleset JSON·적용 스크립트, 워크플로 push 권한·필수 검사 이름 함정, 015 글 링크). velog 용으로 먼저 쓴 원고를 블로그에도 올림. 제목 27·39자, 설명 55·75자, 대기열 11·12번째라 2026-12-02·12-03 무렵 발행.
- 2026-11-22: OG 이미지 한글 줄바꿈 — satori 기본 줄바꿈이 한글 음절 사이("7분/을")에서 끊었고, `wordBreak: 'keep-all'` 도 숫자와 한글 사이("7/분을")에서 끊어서(satori 0.26 이 Intl.Segmenter 낱말 단위로 나눔), `src/lib/og.ts` 의 제목·설명을 공백으로 나눈 낱말 flex 항목 + `flex-wrap` 으로(본문 keep-all 과 같은 결과). `lineClamp` 말줄임은 빠지고 `maxHeight` 로 자름 — 제목 40·설명 80자(check-meta)는 제목 2줄·설명 2줄 안에 들어감을 긴 글 8편(제목 40자 4편·설명 80자 4편, 대기열 포함)으로 확인. 기존 글의 OG 이미지도 모두 다시 만들어짐(SNS 미리보기는 각 서비스 캐시가 지나야 바뀜).
- 2026-11-22: 예약 글 2편(BestOW UI 만들기) — `016-naver-search-advisor-site-audit.md`(네이버 웹마스터 가이드 54문서·구글 44쪽으로 bestow-ui.com 을 대조해 고친 7가지: 파비콘 절대 경로·PNG, playground noindex, 이동 경로 "홈", Storybook 제목·설명, `WebSite` JSON-LD)와 `017-claude-code-seo-skill.md`(korean-seo 스킬 구조·스크립트·스킬 없이/있이 평가 30/54 → 54/54). 구글 파비콘 형식(SVG 없음)은 원문을 다시 확인(2026-11-22). 016 은 017 을 링크하지 않고(하루 먼저 나가 404 가 되므로) 017 이 016 을 링크. 대기열 9·10번째라 2026-11-30·12-01 무렵 발행.
- 2026-11-22: 예약 글 `content-queue/015-github-actions-ci-speed.md`(BestOW UI 만들기) — BestOW UI CI 를 7분에서 약 4.3분으로 줄인 기록(job 분리·Playwright 이미지·샤딩, workers 늘리기가 효과 없던 이유, upload-artifact 숨김 폴더로 기준 이미지가 지워진 버그). 숫자는 모두 실행 로그 값. 제목 40·설명 72자, 대기열 8번째(008~014 뒤)라 2026-11-29 무렵 발행.
- 2026-11-20: 파비콘을 PNG 로 — 구글 파비콘 형식 목록에 SVG 가 없음(korean-seo 스킬 검사). `scripts/generate-favicons.mjs`(sharp)가 `public/favicon.svg` 에서 `favicon-96.png`(96×96, `<link rel="icon">` 하나·절대 주소)와 루트 `favicon.ico`(32·48px PNG 를 담은 ICO)를 만든다. sharp 는 `ui-monospace` 를 못 찾아 "D" 가 고딕체로 그려진다(브라우저 SVG 와 글꼴만 조금 다름). `favicon.svg` 는 원본으로 남김.
- 2026-11-20: 네이버 서치어드바이저에 사이트를 `https://jiwon-seok.com` 으로 새로 등록(기존 등록이 `http://` 였음 — 네이버는 scheme 이 다르면 다른 사이트, "HTTPS 사이트로 등록 바랍니다" 대상). 소유 확인은 기존 meta 값 그대로(`siteConfig.verification.naver`). 사이트맵(`sitemap-index.xml`)·RSS(`rss.xml`)는 이미 제출돼 있어 그대로(네이버가 주기적으로 다시 읽음), 제목·설명을 바꾼 15편 + `/2/` 웹 페이지 수집 요청(사용자). 옛 http 등록은 새 리포트가 쌓인 뒤 삭제.
- 2026-11-20: 제목·설명 길이 검사 `scripts/check-meta.mjs` 를 `pnpm check` 에(로컬 검증·CI). 발행 글과 대기열(컬렉션 밖이라 스키마로 못 잡음)을 함께 보고 제목 40·설명 80자 초과·빈 값·제목=설명이면 실패, 낱말 반복은 경고(조사까지 세는 단순 방식이라 비교 문장과 키워드 반복을 못 가림 — container-queries 설명 "미디어 쿼리는 … 컨테이너 쿼리는" 이 경고로 남음). 처음 돌려 sms-otp 제목의 "입력" 반복(같은 날 오전에 바꾼 제목)을 찾아 "React 6칸 인증번호 입력 — 문자 자동 채우기 붙이기" 로. 43자 시험 글로 실패하는 것 확인. 스키마 `.max()` 는 대기열을 못 잡아 쓰지 않음(SPEC 5장 변경 없음).
- 2026-11-20: 발행 글 길이 맞추기 — 제목이 넘던 2편(view-transitions 51 → 31자 "View Transitions 로 MPA가 다시 빨라진다", SEO 글 47 → 38자 "Storybook 문서가 검색에 안 잡힐 때 — 디자인 시스템 SEO")은 제목·설명, 설명만 넘던 5편(abortcontroller·약관·event-loop·커서·signals)은 설명만 80자 안으로(제목은 잦은 변경을 피해 그대로). 목록 `/2/` 에 고유 설명. 빌드 결과 51쪽 모두 제목 40·설명 80자 이내, 중복 제목·설명 0, h1 1개.
- 2026-11-20: RSS 에 본문 전체(`content:encoded`) — 네이버 "RSS 및 사이트맵 제출" 권장. `rss.xml.ts` 가 Astro Container(`experimental_AstroContainer`)로 글 쪽과 같은 HTML(Shiki 포함)을 그리고, `utils/rss.ts` `absolutizeUrls` 가 본문의 사이트 상대 주소를 절대 주소로(피드에서만, 글 쪽은 그대로 — 006 임시 복사본으로 확인). 피드 19편 337 kB(제한 10MB), XML 파싱 정상. 파비콘·RSS `<link>` 를 절대 주소로(네이버 "파비콘": href 절대 경로, SVG 32×32).
- 2026-11-20: 대기열 007~~014 제목·설명을 검색 노출 기준으로 — 제목 41~~56 → 32~~40자, 설명 145~~207 → 68~80자. 검색어(고대비 모드·@layer·화살표 키·트리 셰이킹·서버 컴포넌트·다크 모드 깜빡임·React 18·19·npm 토큰 없이 배포)를 앞쪽에, 숫자·이름은 본문과 대조(40 kB·네이티브 radio·useSyncExternalStore 등). 임시 복사본으로 check·build, 8편 모두 title·description·h1 1개 확인. 대기열 항목은 끝.
- 2026-11-20: 대기열 006 제목·설명을 검색 노출 기준으로 — 제목 47 → 39자("스크린리더가 aria-live 알림을 안 읽을 때 — 원인과 고치는 법"), 설명 145 → 80자(두 원인·네 사례, 본문과 대조). 임시 복사본으로 check·build, 제목·설명·h1 확인.
- 2026-11-20: 네이버 서치어드바이저 웹마스터 가이드 54쪽 전체 검토 → 운영 사이트 51쪽을 Yeti UA 로 점검(robots·301·404·사이트맵·canonical·OG·alt 정상). 남은 일(RSS 본문 전체·파비콘 절대 주소·대기열 9편과 발행 글 9편 길이·IndexNow·길이 검사)을 ROADMAP 에, 글 쓸 때 지킬 검색 노출 기준을 CLAUDE.md "글 쓰는 법" 에.
- 2026-11-20: 검색 노출 개선 — 방문 통계(Web Analytics 7일: 사람 방문 32, 그중 약 26 은 운영자 본인 macOS 27, 외부 유입은 velog 4·baidu 1)·Search Console(28일 노출 60·클릭 3·평균 7위, 잡힌 검색어는 7월 글 영어 용어뿐)을 보고 8편의 `title`·`description` 에 한국어 검색어(깊은 복사·부모 선택자·INP FID 차이·유효성 검사·웹 접근성·명도 대비·문자 자동 채우기 등)를 넣고 네이버 권장 길이(제목 40·설명 80자) 안으로. 본문 사실과 대조(200ms·toSpliced·형제 선택·TS 코드). `BaseLayout` 은 "제목 · 사이트 이름" 이 40자를 넘으면 사이트 이름을 뺀다. `updatedDate` 는 본문이 그대로라 올리지 않음.
- 2026-11-18: 발행 글 17편 사실 점검 후 12편 수정(`updatedDate` 추가) — view-transitions 같은 문서 전환 Firefox 133→144(MDN BCD)·Angular zoneless 시점·사이트 JS 설명·의견 글 출처를 MDN 으로, satisfies 의 `as` 설명(tsc 로 확인), css-has 의 `:has()` 없는 예시, closures 예시(Node 22 실측), INP 기준값·scroll, structuredClone 주석, groupBy 지원, 약관 글 "다섯 번"·버튼 기준(WCAG 2.4.6), OTP 예시에 이름·"줄인 코드", KWCAG 글 hover 대비 발견 경위, hello-world 배포 방식 덧붙임. BestOW UI 글 수치·코드는 원본·재계산과 일치.
- 2026-11-17: 대기열 004~014 사실 검토(BestOW UI 코드·기록, Google·React·Context7·npm 공식 문서, Next.js 16.4.6 실제 빌드) — 004 JSON-LD 설명의 `<` 가 `<` 로 잘못 적힌 것·Article 권장 속성에 `headline` 추가, 006 "4건 안 들림" → 3건 + 개선 후보 1건(10-23 수정)으로, 007 Playwright forced-colors "Chromium 뿐" 을 확인한 범위로, 014 "pnpm 10 은 OIDC 미지원" 단정을 우리 환경(10.34.7) 경험으로 낮추고 승인 만료 메시지 추가. 나머지 수치·코드는 원본과 일치.
- 2026-11-17: 글 예약 — 대기열 004(디자인 시스템 문서 SEO·GEO) + 005~~014(BestOW UI 만들기 10편: 커서 유지·스크린리더 알림 타이밍·고대비·CSS @layer·네이티브 라디오·트리 셰이킹·서버 컴포넌트·다크 모드·React 18/19·npm Trusted Publishing)가 11/18~~11/28 매일 1편. 사실·코드는 BestOW UI 저장소의 코드·기록과 대조. 네이버 서치어드바이저에 `/rss.xml` 제출(사용자), AdSense 는 "검토 중"(사용자 확인).
- 2026-11-17: 도메인 정리(Cloudflare 설정, 사용자) — 옛 workers.dev 주소 끄기, `www` → 루트 301, Always Use HTTPS, SPF `-all`·DMARC `reject`. 모든 주소가 `https://jiwon-seok.com` 으로 모이는 것을 확인. 메일을 쓰게 되면 SPF·DMARC 부터 바꾼다.
- 2026-11-17: ROADMAP 정리 — 남은 일만(광고 심사·옛 workers.dev 주소 끄기·DNS 정리·조회수 표시·i18n·이미지 파이프라인), 끝난 항목 상세는 `docs/ROADMAP-HISTORY.md` 로. 커스텀 도메인·애널리틱스 수집은 이미 끝나 있어 완료로 옮김. 개인정보처리방침에 실제로 쓰는 Cloudflare Web Analytics 항목 추가(시행일 11/17).
- 2026-11-17: CLAUDE.md 정리 — BestOW UI 작업 규칙 중 맞는 것(한국어 답변·커밋은 사용자·gitmoji 추천·검증 전부 통과·브라우저 점검·접근성 기준·글은 확인한 것만) 추가, 옛 문구(workers.dev·`gh api`·"매일 09:00 발행") 정리. 검증 중 `pnpm format:check` 가 md 7개로 실패하던 것을 발견(CI 는 main push 에서 안 돎) — `pnpm format` 이 글 속 코드 블록까지 바꿔서 `.prettierrc.json` 에 md·mdx `embeddedLanguageFormatting: off` 를 두고 서식만 정리(글 5편 빌드 HTML 이 정리 전과 동일함을 비교).
- 2026-11-17: 댓글 칸 "불러오는 중" 안내(giscus 는 지연 로딩이라 제목 아래가 비어 보였음) — giscus.app 메시지를 받으면 지우고, 막혀서 안 뜨면 남아 GitHub Discussions 링크를 준다. 글 목록·글 머리의 태그 링크 누름 영역 20 → 28px(WCAG 2.5.8, `py-1 -my-1` 로 줄 간격은 그대로 — 한 줄이라 겹치지 않음). axe 위반 0.
- 2026-11-17: 글 끝 이동·추천. 시리즈 글은 이전·다음 편, 아닌 글은 발행일 기준 이전·다음 글(`getAdjacentPosts`), 그 아래 "함께 읽으면 좋은 글" 3편(`getRelatedPosts` — 태그가 많이 겹치는 순, 겹치는 태그가 없으면 넣지 않음, 바로 위 이전·다음 글은 뺌, pagefind 제외). BestOW UI 관련 글 5편 + 대기열 004 를 시리즈 `BestOW UI 만들기` 로 묶고, 첫 화면 "최근 글" 위에 2편 이상인 시리즈 카드. 태그·시리즈 쪽 제목 한국어. axe 위반 0(데스크톱 라이트·모바일 다크).
- 2026-11-17: 소개 쪽 `/about/`(하는 일·주제·BestOW UI·연락 — 공개 GitHub 프로필과 블로그 Discussions 만, 이메일·실명은 넣지 않음). 머리글 "소개"(모바일은 숨김 — 넣으면 390px 에서 로고가 두 줄), 바닥글에 소개·GitHub·RSS·개인정보처리방침. 첫 화면 소개·meta description 을 다루는 주제가 드러나게(`siteConfig.description`). `.prose h1` 스타일(소개·개인정보처리방침의 h1 이 본문 크기였음). axe 위반 0, 320~390px 가로 넘침 0.
- 2026-11-17: 본문 글꼴 경량화. 쪽마다 받던 `PretendardVariable.subset.woff2`(상용 2,780자·전 굵기) 630 kB 가 전송량의 2/3 → 빌드 뒤 `scripts/subset-dist-font.mjs` 가 dist 의 모든 HTML·XML 에 쓰인 글자(+ASCII·기호, 현재 853자·한글 661)와 굵기 400~~700 만 남겨 116 kB 로(`@font-face` font-weight 400 700). 줄인 파일은 내용 해시로 이름을 새로 짓고 CSS 참조를 바꾼다(Astro 해시는 원본 기준이라 글자가 늘어도 이름이 같아 옛 캐시가 쓰임). 글꼴·참조를 못 찾으면 빌드 실패. 동적 서브셋(92조각)은 쪽당 370~~505 kB·여러 쪽이면 822 kB 라 택하지 않음. 쪽의 모든 글자가 새 글꼴에 있는지 대조(빠진 ⌊⌋·이모지는 원래 글꼴에도 없음). 블로그 자체 전송량 쪽당 약 640 → 130 kB.
- 2026-11-17: 가독성·접근성 점검(라이브 32화면 axe·스크린샷) 반영. 본문 전체 `word-break: keep-all`(한글이 "붙이/기" 처럼 낱말 가운데서 끊기던 문제 — 전엔 표에만), 머리글 메뉴 한국어(홈·태그·시리즈·검색), 첫 화면의 중복 바로가기 링크 줄 제거, "본문으로 건너뛰기" 링크 + `<main id="main">`, 검색 입력 `aria-label`(Pagefind 는 title 만), 404 에 h1, 페이지 이동 비활성 글자 대비(neutral-500/dark:neutral-400), Shiki 고대비 테마(`github-*-high-contrast` — 기본 테마는 주석 등 대비 4.5:1 미만). 글 5편의 옛 `dev-bestow.github.io/BestOW-UI` 링크를 `bestow-ui.com` 으로(인증번호·약관·사업자번호 글은 새 컴포넌트 문서 쪽으로). 재점검 axe 위반 0·가로 넘침 0. 남은 것: 본문 글꼴 631 kB 경량화, About 쪽, 이전·다음 글.
- 2026-11-17: 글 두 편(kwcag-automated-testing, oklch-contrast-theme)의 BestOW UI Storybook 링크를 `/BestOW-UI/?path=` → `/BestOW-UI/storybook/?path=` 로 수정. 문서 사이트 첫 화면이 소개 페이지로 바뀌어 옛 링크로는 해당 문서가 열리지 않았음.
- 2026-11-15: 광고 준비(수익화). `siteConfig.ads`(AdSense 게시자 ID·광고 단위, 카카오 애드핏 단위 — 비어 있으면 아무것도 그리지 않음), 글 끝 `AdSlot.astro`(댓글 위, CLS 막는 최소 높이, pagefind 제외), head 의 AdSense 소유 확인 메타·스크립트, `/ads.txt`(`src/pages/ads.txt.ts`), 개인정보처리방침 `/privacy/` + 푸터 링크. 신청 순서는 `docs/ADS.md`.
- 2026-10-23: 본문 표 스타일 추가(`global.css` `.prose table`). Tailwind preflight 가 테두리·여백을 지워 표가 글자만 늘어서 보이던 문제 — 칸 테두리(neutral-300/700)·안쪽 여백·머리줄 배경(neutral-100/800, 줄바꿈 없음)·짝수 줄 배경, 한글 `keep-all` + `overflow-wrap: break-word`(anywhere 는 칸 최소 폭을 한 글자로 줄여 "항/목/수" 로 끊김). 마크다운 `---:` 정렬은 인라인 style 이라 그대로 적용. 라이트·다크·375px 스크린샷 확인(가로 스크롤 없음), `check`·`build`·lint·format 통과.
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
