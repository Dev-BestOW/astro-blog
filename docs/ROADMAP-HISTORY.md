# 개발 블로그 — 끝난 작업 기록

> [ROADMAP.md](./ROADMAP.md) 에서 끝난 항목의 상세(목적·범위·결과)를 옮겨 둔 곳이다. 2026-11-17 정리.
> 이후 작업의 기록은 [SPEC.md](./SPEC.md) "변경 이력" 에 한 줄씩 남는다.

## P1 — 품질·운영 기반 (권장 우선 착수)

배포 파이프라인은 이미 있으나, **변경을 안전하게 만드는 안전망**이 아직 없다. 글이 늘고 손이 많이 가기 전에 먼저 깔아두는 것이 비용이 가장 적다.

### 1. ESLint + Prettier ✅

- **목적**: 일관된 코드 스타일과 기본적인 정적 오류 차단.
- **범위**
  - `eslint`, `eslint-plugin-astro`, `@typescript-eslint/*`, `prettier`, `prettier-plugin-astro` 추가
  - `eslint.config.js`(flat config), `.prettierrc`, `.prettierignore`
  - `package.json` 스크립트: `lint`, `format`
- **완료 기준**: `pnpm lint` 0 error, `pnpm format` 후 diff 없음. 기존 파일 전부 통과.
- **결과**: flat config(`defineConfig`+`typescript-eslint`+`eslint-plugin-astro`) 구성. 스크립트 `lint`/`lint:fix`/`format`/`format:check` 추가. 전체 소스 포맷·린트 통과, `astro check` 0 errors/hints, build 성공.
- **의존성**: 없음. **규모**: S

### 2. GitHub Actions CI ✅

- **목적**: PR/브랜치에서 타입·빌드 회귀를 배포 전에 잡는다. (Cloudflare 빌드는 main 배포 시점이라 사후)
- **범위**
  - `.github/workflows/ci.yml`: `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm lint` → `pnpm build`
  - Node 22 / pnpm 10 (레포의 `.nvmrc`·`packageManager`와 일치)
  - 트리거: `pull_request`, `push`(main 제외 브랜치)
- **완료 기준**: 의도적으로 타입 오류를 넣은 PR이 red로 막히는 것을 확인.
- **의존성**: 1번(lint 스텝 포함하려면). **규모**: S
- **결과**: 단일 `verify` 잡(checkout → pnpm/action-setup → setup-node(`.nvmrc`+pnpm 캐시) → `install --frozen-lockfile` → `check`/`lint`/`format:check`/`build`). 트리거는 `pull_request` + `push`(main 제외), `concurrency`로 중복 실행 취소. 로컬 검증: 타입 오류 주입 시 `pnpm check` exit 1(→ Typecheck 스텝 red), 원복 후 exit 0.

### 3. robots.txt ✅

- **목적**: 크롤러 정책 명시 + 사이트맵 위치 안내.
- **범위**: `public/robots.txt` (전체 허용 + `Sitemap: https://.../sitemap-index.xml`). 또는 `siteConfig.url` 기반 동적 생성(`src/pages/robots.txt.ts`)으로 도메인 변경에 강하게.
- **완료 기준**: 배포본 `/robots.txt` 200, 사이트맵 절대 URL 포함.
- **의존성**: 없음. **규모**: XS
- **결과**: 동적 생성(`src/pages/robots.txt.ts`, `siteConfig.url` 기반) 채택 → 도메인 변경 시 자동 반영. 빌드 산출물 `dist/robots.txt`에 `User-agent: * / Allow: /` + `Sitemap: …/sitemap-index.xml`(절대 URL) 확인.

### 4. JSON-LD 구조화 데이터 ✅

- **목적**: 검색엔진 리치 결과. 글 상세에 `BlogPosting` 스키마.
- **범위**: `PostLayout`에 `<script type="application/ld+json">` — `headline`, `datePublished`, `dateModified`, `author`, `image`(생성 OG), `mainEntityOfPage`. 홈은 `WebSite`(+ 향후 `SearchAction`).
- **완료 기준**: [Rich Results Test](https://search.google.com/test/rich-results) 통과, 오류 0.
- **의존성**: 없음(검색 붙이면 `SearchAction` 추가). **규모**: S
- **결과**: `BaseLayout`에 `jsonLd` prop 추가(`<`→`<` 이스케이프 + `is:inline`). 글 상세는 `PostLayout`에서 `BlogPosting`(headline·description·datePublished·dateModified·author·publisher·image(생성 OG)·mainEntityOfPage·keywords·inLanguage) 주입, 홈(`/`)은 `WebSite` 기본값. 빌드 산출물에서 home=1/post=1/tags=0 렌더 및 JSON 파싱 검증. (Rich Results Test는 배포 후 실측 권장)

---

## P2 — 콘텐츠 경험

### 5. Pagefind 검색 ✅

- **목적**: 정적 전문 검색(서버리스 불필요 → 현재 정적 배포와 궁합 좋음).
- **범위**
  - 빌드 후 `pagefind --site dist` 인덱싱 (build 스크립트 뒤에 체이닝)
  - 검색 UI: 헤더 검색 or `/search` 페이지, Pagefind UI 번들 로드
  - 인덱스 대상: 글 본문(태그/설명 포함)
- **완료 기준**: 배포본에서 한글 키워드 검색 결과 정확, JS 페이로드는 검색 상호작용 시에만 로드.
- **의존성**: 없음. 인덱싱이 `dist` 기준이라 **배포 파이프라인의 build 명령 확장** 필요.
- **주의**: 한글 형태소 검색 한계 확인(부분일치 동작 테스트). **규모**: M
- **결과**: `build` = `astro build && pagefind --site dist`(CF·CI 공통). `PostLayout` article에 `data-pagefind-body`(글만 인덱싱), TOC엔 `data-pagefind-ignore`. `/search` 페이지 + Pagefind Default UI(한글 번역·다크모드 변수 매핑), nav에 Search 추가. 인덱스 대상 = 제목+본문+태그+설명(설명은 글 상단 subtitle로 렌더해 자연 인덱싱). 브라우저 실측: "블로그"→1건(접두 부분일치 `블로그를`까지), "스택"→설명 매칭 1건, 콘솔 에러 0. 인덱스는 검색 상호작용 시 lazy 로드. `@pagefind/linux-x64`가 lockfile에 있어 CI/CF(Linux x64) `--frozen-lockfile` 정상.
- **한계**: 한글 stemming 미지원(어근 매칭 X) — 접두 부분일치는 동작. `astro dev`에선 인덱스 미생성이라 검색 비활성(빌드 후 `pnpm preview`에서 확인).

### 6. giscus 댓글 ✅

- **목적**: GitHub Discussions 기반 댓글(가입 장벽 낮고 스팸 관리 쉬움).
- **범위**
  - GitHub 레포에 Discussions 활성화 + giscus 앱 설치
  - `Comments.astro`(테마 라이트/다크 동기화), `PostLayout` 하단에 삽입
  - 카테고리/매핑(pathname) 설정
- **완료 기준**: 글에서 댓글 작성/표시, 다크모드 전환 시 테마 동기화.
- **의존성**: 없음(외부 설정은 사용자 GitHub 권한 필요). **규모**: S
- **결과**: `Comments.astro`(`siteConfig.giscus` config 기반, `PostLayout` 하단, 다크모드 `MutationObserver` 테마 동기화, `pathname` 매핑, `Announcements` 카테고리(유지관리자 생성→giscus 앱 대행), `inputPosition: bottom`, `ko`, lazy). config에 `repoId`(R_kgDOTOsu_A)·`categoryId`(DIC_kwDOTOsu_M4DAmFs, GraphQL로 조회) 채움. 브라우저 실측: giscus iframe 로드·기존 댓글 표시·다크↔라이트 토글 시 iframe 테마 동기화 확인. 미설정 시 inert 가드는 유지(값 비우면 자동 비활성).

### 7. 시리즈/연재 그룹핑 ✅

- **목적**: 연재물(예: "Astro 블로그 만들기 1~N")을 묶어 탐색.
- **범위**
  - 프론트매터에 `series?: string`, `seriesOrder?: number` 추가(스키마 확장)
  - `/series`, `/series/[name]` 페이지, 글 상단/하단에 시리즈 목차
- **완료 기준**: 같은 series 글이 순서대로 묶여 표시, 이전/다음 편 이동.
- **의존성**: 없음. 콘텐츠 스키마 변경이라 **SPEC 5장 스키마 갱신** 동반. **규모**: M
- **결과**: SPEC 5장 선행 갱신 후 `content.config.ts`에 `series`/`seriesOrder` 추가. `utils/posts.ts`에 `getAllSeries`/`getSeriesPosts`/`getSeriesContext`(정렬: seriesOrder↑ → pubDate↑). `/series`(목록·빈 상태), `/series/[name]`(01·02… 순번 목록) 페이지, `SeriesNav` 컴포넌트로 글 상단 목차(현재 편 강조, `data-pagefind-ignore`)+하단 이전/다음 편. nav에 Series. 임시 3편으로 브라우저 실측(그룹핑·순서·현재강조·prev/next·한글 URL) 후 원복 → 빈 상태 확인. check 0/0/0.

---

## 디자인 · UX 개선 (신규 · 2026-07-06 진단)

> 기능은 프로덕션급이나 **디자인 언어가 비어 있는 상태**(거의 순정 Tailwind 기본값). 방문자 체감 품질을 올리기 위한 백로그.
> 임팩트 대비 노력 순위: **D1 → D2 → D3 → D4 → D5 → D6**. D1·D2만으로도 첫인상이 크게 달라짐.

### D1. 본문 Pretendard 적용 ✅ 🔴 최우선

- **문제**: `og.ts`는 Pretendard 서브셋을 OG 이미지에 쓰지만, **사이트 본문에는 `font-family`가 어디에도 없음**(`global.css`·`astro.config.mjs` 확인). 실제 페이지는 OS 시스템 폰트로 렌더 → macOS(Apple SD Gothic Neo)·Windows(맑은 고딕)마다 타이포가 다르고 OG 카드와 인상이 어긋남.
- **범위**: Pretendard(또는 Variable) self-host — `woff2` subset을 `src/assets/fonts`에 두고 `@font-face` + `font-display: swap`, `global.css`에서 `body` 기본 폰트로 지정. `preload`로 CLS 방지.
- **주의**: OG용 `*.subset.woff`(빌드타임 전용)와 **별개 파일**로 관리(웹폰트는 woff2, 커버리지 넓게). `wrangler.jsonc`/OG 파이프라인 건드리지 말 것.
- **완료 기준**: 라이트/다크 모두 Pretendard 렌더, Lighthouse CLS 회귀 없음. **규모**: S
- **결과**: **Pretendard Variable(전 weight 45–920)** 을 pretendard 공식 상용 글자 목록(라틴+상용 한글 2,780자+기호)으로 서브셋한 **단일 woff2(0.63MB, -68.6%)** 를 `src/assets/fonts/PretendardVariable.subset.woff2` 로 self-host. `global.css` 에 `@font-face`(font-display:swap) + `@theme --font-sans` 지정 → 전 페이지 본문 폰트. 서브셋 미포함 희귀 음절은 폴백 스택(시스템 한글 폰트)이 렌더 → 두부 0. 생성 스크립트 `scripts/subset-body-font.mjs`(원본은 devDep `pretendard`). Vite가 해시 번들. 라이트/다크·데스크톱/모바일 브라우저 육안 검증. OG용 `Pretendard-*.subset.woff`(정적 400/700)는 그대로 유지.

### D2. 브랜드 / accent 토큰화 ✅

- **문제**: accent가 전부 `blue-600`/`blue-400` **순정 기본값**, 브랜드 색 없음 → 템플릿 인상. 링크·호버·포커스·TOC 하이라이트가 개별 하드코딩되어 한 곳에서 못 바꿈.
- **범위**: `global.css`에 `--accent`(+ dark) CSS 변수 정의, 링크/버튼/호버/포커스 계열을 토큰 참조로 통일. Pagefind `--pagefind-ui-primary`도 동일 토큰과 일치.
- **완료 기준**: 변수 한 곳 수정으로 사이트 전역 accent 변경. **규모**: S
- **결과**: `--accent`(라이트 `#4f46e5` indigo-600 / 다크 `:root.dark` `#818cf8` indigo-400) 정의 + Tailwind v4 `@theme --color-accent: var(--accent)` 로 `text-accent`/`hover:text-accent` 유틸 노출. **변수만 뒤집혀 자동 전환**되므로 컴포넌트는 `dark:` 변형 제거하고 `text-accent` 하나로 통일(전 컴포넌트·페이지·prose 링크·Pagefind `--pagefind-ui-primary` 교체). **주의(하드런 교훈)**: 링크가 `dark:text-neutral-400`를 함께 가지면 JS로 붙이는 **base `text-accent`(명시도 0,1,0)가 다크에서 소스순서로 패배** → TOC 활성 하이라이트는 전용 `[data-toc-link].is-active`(명시도 상승) 규칙으로 처리. hover/포커스는 pseudo-class로 명시도가 높아 문제 없음.

### D3. sticky 사이드바 TOC ✅

- **문제**: TOC가 본문 위 박스로 얹혀 스크롤하면 사라짐. 전 페이지 `max-w-2xl` 중앙정렬이라 데스크톱 양옆이 텅 빔. IntersectionObserver 현재섹션 하이라이트 로직은 이미 있으나 안 보여서 무용.
- **범위**: `xl` 이상에서 본문 옆 `position: sticky` 사이드바 TOC(모바일은 현행 접이식 유지). `PostLayout` 레이아웃 그리드 조정 필요.
- **완료 기준**: 데스크톱에서 스크롤 중 TOC 고정·현재 섹션 하이라이트 동작, 모바일 회귀 없음. **규모**: M
- **결과**: TOC 인스턴스는 **하나만** 두고(중복 `data-toc-link` 슬러그 방지) CSS로만 위치 전환. `PostLayout` 스코프 스타일에서 `@media (min-width:1280px)` 시 `.toc-floating`을 `position:fixed; left:calc(50% + 22.5rem)`(중앙정렬 본문 672px의 오른쪽 여백)로 배치 → **컨테이너 폭·헤더 정렬을 안 건드림**. `max-height`+`overflow-y:auto`로 긴 목차 대응. 모바일/태블릿(<xl)은 기존 인라인 흐름 유지. IntersectionObserver 하이라이트는 `is-active` 클래스로 복원(D2 결과 참고). 데스크톱 스크롤 고정·활성 하이라이트(라이트/다크) 브라우저 검증.

### D4. 홈 히어로 / 소개 ✅

- **문제**: 홈이 `<h1>최근 글</h1>` + 목록뿐. `siteConfig.description`·저자 소개·도입부가 어디에도 노출 안 됨 → "누구의 블로그인지" 첫인상 없음.
- **범위**: `[...page].astro` 1페이지 상단에 간단한 인트로(이름·한 줄 소개·주요 링크) 영역. 2페이지+에는 미노출.
- **완료 기준**: 홈 첫 화면에 정체성 노출, 페이지네이션 2+에는 없음. **규모**: S
- **결과**: `[...page].astro` 1페이지(`isFirst`)에만 히어로 섹션(사이트 제목 `h1` + `description` + 태그/시리즈/검색/RSS 바로가기, 하단 구분선). 목록 heading은 `h2 "최근 글"`로 강등해 h1 중복 제거. 2페이지+는 히어로 없이 `h1 "최근 글 · N페이지"`. 브라우저 검증(라이트/다크/모바일).

### D5. 모바일 헤더 · 포커스 링 ✅

- **문제**: 헤더 nav 5개(Home/Tags/Series/Search/RSS)+토글이 `flex gap-1` → 좁은 화면 혼잡/줄바꿈. RSS가 피드인데 텍스트 링크로 섞임. 커스텀 버튼/링크에 `focus-visible:` 없어 키보드 탐색 위치 안 보임(a11y).
- **범위**: 모바일 nav 반응형 축소(핵심만 노출 + 나머지/RSS 아이콘화 또는 접기), 인터랙티브 요소에 `focus-visible:ring`(D2 accent 토큰 사용).
- **완료 기준**: 360px 폭에서 헤더 정돈, 키보드 탭 이동 시 포커스 가시. **규모**: S
- **결과**: `siteConfig.nav` 항목에 `hideOnMobile`(Home — 로고와 중복) / `icon`('search','rss') 플래그 추가(SSOT 유지). `Header.astro`가 icon 항목은 SVG 아이콘 링크(aria-label), 나머지는 텍스트 링크로 렌더, Home은 `hidden sm:inline-block`. 375px에서 한 줄 정돈 확인. 포커스 링은 **전역 규칙**으로 처리: `global.css` 의 `:where(a,button,summary,[tabindex]):focus-visible { outline: 2px solid var(--accent) }` (마우스 클릭엔 안 뜨고 키보드 탭에만). 컴포넌트마다 반복 불필요.

### D6. 코드블록 UX ✅

- **문제**: 개발 블로그인데 `.prose pre`가 단순 둥근 박스. 언어/파일명 라벨·복사 버튼 없음.
- **범위**: Shiki transformer 또는 rehype 플러그인으로 언어 뱃지 + 복사 버튼(작은 JS). 다크/라이트 대응.
- **완료 기준**: 코드블록에 언어 표시·복사 동작, 다크모드 정상. **규모**: M
- **결과**: `astro.config.mjs` shikiConfig에 transformer 추가 → `<pre>`에 `data-language` 주입(text/plaintext 제외). `PostLayout`의 클라이언트 스크립트가 렌더된 `pre.astro-code`를 `.code-block` 래퍼로 감싸고 우상단에 언어 라벨 + "복사" 버튼 주입(`navigator.clipboard`, "복사"→"복사됨" 피드백). 스타일은 `global.css`(라이트/다크 대응). 마크다운 파이프라인·prose 스타일은 최소 변경. 복사 동작·라벨·다크모드 브라우저 검증(css/ts 코드블록).

---

## 기술 부채 / 개선 노트

### A. OG 폰트 서브셋 ✅

- **현황**: `src/assets/fonts/Pretendard-{Bold,Regular}.otf` 각 ~1.5MB(총 3MB)를 레포에 커밋. 빌드타임에만 사용.
- **개선**: 실제 OG에 쓰이는 글자 범위로 서브셋(예: `subset-font`, KS X 1001 상용 한글 + 라틴)하면 수백 KB로 축소 가능 → 레포 경량화·설치 속도.
- **주의**: 서브셋이 미포함 글자를 만나면 두부(□) 발생 → 커버리지 넉넉히. **규모**: S
- **결과**: `subset-font`로 **현대 한글 음절 전체(U+AC00–D7A3) + 라틴/자모/구두점**만 남긴 서브셋 **WOFF**로 교체(두부 위험 0). satori가 WOFF를 직접 읽어 런타임 변경 없음. 원본 OTF는 레포에서 제거(`.gitignore`) → 폰트 3.15MB → **1.7MB(-44%)**. 재생성: `node scripts/subset-fonts.mjs`(OTF를 임시로 두고 실행). 프로덕션 OG(제목·기본) 육안 검증 — 한글·em-dash·Bold/Regular 정상. (전체 음절 유지라 KS X 1001보다 크지만 두부 0을 택함)

### B. heroImage 활용 정리 ✅

- **현황**: 스키마에 `heroImage`가 있고 `PostLayout` 본문 상단에 렌더되지만, **OG는 생성 PNG를 우선** 사용(heroImage는 OG에 미사용).
- **정할 것**: heroImage가 있으면 OG로도 쓸지, 계속 생성 PNG로 통일할지 정책 확정 후 문서화.
- **규모**: S
- **결정**: **OG는 생성 PNG로 통일**(브랜드 일관성·항상 존재·1200×630 보장). `heroImage`는 **본문 상단 표시 전용**으로 유지. 근거: 생성 OG가 이미 검증됨(satori, 두부 0)이고, heroImage를 OG로 쓰면 이미지마다 규격/절대 URL 관리가 필요해 일관성이 떨어짐. 필요 시 향후 "heroImage 있으면 OG 대체" 옵션은 `BaseLayout`의 `image` prop만 바꾸면 되는 소규모 작업으로 남겨둠(SPEC에 정책 명시).

---

## 2026-11-17 정리 때 끝난 것으로 옮긴 항목

- **커스텀 도메인** ✅ — `astro-blog.dev-bestow.workers.dev` → `https://jiwon-seok.com`(Cloudflare Registrar, apex). `SITE_URL`·`astro.config.mjs`·`wrangler.jsonc` 반영. (옛 workers.dev 주소가 아직 열리는 문제는 ROADMAP "남은 일")
- **애널리틱스(수집)** ✅ — Cloudflare Web Analytics(쿠키 없음)가 Cloudflare 쪽 설정으로 붙어 있다(`static.cloudflareinsights.com/beacon.min.js`, `/cdn-cgi/rum`). 코드 변경 없음. 2026-11-17 개인정보처리방침에 항목 추가. 조회수를 화면에 보이는 것은 남은 일.
- **2026-11-17 블로그 점검 반영** ✅ — 한글 낱말 단위 줄바꿈·접근성(axe 0)·글꼴 630→116 kB·소개 쪽·이전·다음 글과 함께 읽을 글·시리즈 "BestOW UI 만들기"·댓글 불러오는 중 안내·태그 누름 영역. 상세는 SPEC 변경 이력.
- **옛 workers.dev 주소 끄기** ✅(2026-11-17, 사용자) — Cloudflare › Workers › astro-blog › Domains & Routes 에서 workers.dev Disable → `astro-blog.dev-bestow.workers.dev` 404(error 1042). 쪽들의 canonical 은 원래 jiwon-seok.com 이었다. 배포 뒤 다시 켜지는지는 ROADMAP 에서 재확인.
- **DNS 정리** ✅(2026-11-17, 사용자 설정 · Claude 확인) — `www` A 레코드(192.0.2.1, Proxied) + Redirect Rule "www → 루트"(301, 경로·쿼리 유지), SSL/TLS **Always Use HTTPS**(전엔 `http://jiwon-seok.com` 이 200 으로 그대로 열렸고 `http://www` 는 522), 메일을 안 쓰는 도메인의 위조 방지 TXT `v=spf1 -all` · `_dmarc` `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;`. Search Console 확인 TXT 유지. CAA 는 Cloudflare 인증서 자동 갱신을 막을 수 있어 두지 않음. 확인: `http://www.jiwon-seok.com/posts/hello-world/?a=1` → 2번 넘겨져 `https://jiwon-seok.com/posts/hello-world/?a=1` 200.
