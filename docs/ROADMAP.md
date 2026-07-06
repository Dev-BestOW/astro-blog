# 개발 블로그 — 로드맵 / 남은 작업

> v1(M1–M4)은 완료·배포됨. 이 문서는 **그 이후 해야 할 작업**을 우선순위별로 정리한다.
> 스펙·결정의 단일 기준은 [SPEC.md](./SPEC.md), 여기는 실행 백로그다.
> 항목을 시작하면 상태를 갱신하고, 완료 시 SPEC.md 변경 이력에도 한 줄 남긴다.

- **기준일**: 2026-07-06
- **상태 범례**: ⬜ 예정 · 🟡 진행 중 · ✅ 완료

---

## 우선순위 개요

| 우선순위     | 항목                  | 한 줄 요약                        | 규모 |
| ------------ | --------------------- | --------------------------------- | ---- |
| **P1** ✅    | ESLint + Prettier     | 코드 스타일/린트 게이트           | S    |
| **P1** ✅    | GitHub Actions CI     | PR에서 `astro check` + build 검증 | S    |
| **P1** ✅    | robots.txt            | 크롤러 허용 + 사이트맵 링크       | XS   |
| **P1** ✅    | JSON-LD 구조화 데이터 | 글 상세 `BlogPosting` 스키마      | S    |
| **P2**       | Pagefind 검색         | 정적 클라이언트 전문 검색         | M    |
| **P2**       | giscus 댓글           | GitHub Discussions 기반 댓글      | S    |
| **P2**       | 시리즈/연재 그룹핑    | 연재 글 묶음                      | M    |
| **P3**       | i18n (다국어)         | 한/영 등 다국어 라우팅            | L    |
| **P3**       | 조회수/애널리틱스     | 프라이버시 친화 통계              | M    |
| **P3**       | 커스텀 도메인         | workers.dev → 소유 도메인         | S    |
| **기술부채** | 폰트 서브셋           | OG 폰트 3MB → 대폭 축소           | S    |
| **기술부채** | heroImage 활용        | 본문 상단 대표 이미지 노출 정리   | S    |

규모: XS(<30분) · S(반나절) · M(1–2일) · L(3일+)

---

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

### 5. Pagefind 검색 ⬜

- **목적**: 정적 전문 검색(서버리스 불필요 → 현재 정적 배포와 궁합 좋음).
- **범위**
  - 빌드 후 `pagefind --site dist` 인덱싱 (build 스크립트 뒤에 체이닝)
  - 검색 UI: 헤더 검색 or `/search` 페이지, Pagefind UI 번들 로드
  - 인덱스 대상: 글 본문(태그/설명 포함)
- **완료 기준**: 배포본에서 한글 키워드 검색 결과 정확, JS 페이로드는 검색 상호작용 시에만 로드.
- **의존성**: 없음. 인덱싱이 `dist` 기준이라 **배포 파이프라인의 build 명령 확장** 필요.
- **주의**: 한글 형태소 검색 한계 확인(부분일치 동작 테스트). **규모**: M

### 6. giscus 댓글 ⬜

- **목적**: GitHub Discussions 기반 댓글(가입 장벽 낮고 스팸 관리 쉬움).
- **범위**
  - GitHub 레포에 Discussions 활성화 + giscus 앱 설치
  - `Comments.astro`(테마 라이트/다크 동기화), `PostLayout` 하단에 삽입
  - 카테고리/매핑(pathname) 설정
- **완료 기준**: 글에서 댓글 작성/표시, 다크모드 전환 시 테마 동기화.
- **의존성**: 없음(외부 설정은 사용자 GitHub 권한 필요). **규모**: S

### 7. 시리즈/연재 그룹핑 ⬜

- **목적**: 연재물(예: "Astro 블로그 만들기 1~N")을 묶어 탐색.
- **범위**
  - 프론트매터에 `series?: string`, `seriesOrder?: number` 추가(스키마 확장)
  - `/series`, `/series/[name]` 페이지, 글 상단/하단에 시리즈 목차
- **완료 기준**: 같은 series 글이 순서대로 묶여 표시, 이전/다음 편 이동.
- **의존성**: 없음. 콘텐츠 스키마 변경이라 **SPEC 5장 스키마 갱신** 동반. **규모**: M

---

## P3 — 확장 (필요 시)

### 8. i18n (다국어) ⬜

- **목적**: 한/영 등 다국어 콘텐츠·라우팅.
- **범위**: Astro i18n 라우팅(`/en/…`), 콘텐츠 컬렉션 언어 분리 또는 `lang` 필드, 언어 스위처, `hreflang` 메타.
- **완료 기준**: 언어별 목록/상세/사이트맵/hreflang 정상.
- **의존성**: URL 구조 결정 필요(현재 구조에 영향 큼 → 도입 전 설계). **규모**: L

### 9. 조회수 / 애널리틱스 ⬜

- **목적**: 트래픽 파악. 프라이버시 친화(쿠키리스) 우선.
- **범위 옵션**: Cloudflare Web Analytics(무료·쿠키리스, 현재 CF와 궁합 최적) / Plausible / Umami. 조회수 표시가 필요하면 CF KV·D1 등 별도 스토어(현재 정적 배포와 트레이드오프 검토).
- **완료 기준**: 페이지뷰 수집 확인. (조회수 노출은 별도 결정)
- **의존성**: 조회수 노출은 정적↔동적 트레이드오프 결정 필요. **규모**: M

### 10. 커스텀 도메인 ⬜

- **목적**: `astro-blog.dev-bestow.workers.dev` → 소유 도메인.
- **범위**: CF에 도메인 연결(라우트/DNS), `SITE_URL`·`astro.config.mjs`의 `site`·`wrangler.jsonc` 갱신, canonical/OG/RSS/sitemap 재생성.
- **완료 기준**: 새 도메인 200, 구 도메인 리다이렉트(선택), 메타 전부 새 도메인.
- **의존성**: 도메인 보유. **규모**: S

---

## 기술 부채 / 개선 노트

### A. OG 폰트 서브셋 ⬜

- **현황**: `src/assets/fonts/Pretendard-{Bold,Regular}.otf` 각 ~1.5MB(총 3MB)를 레포에 커밋. 빌드타임에만 사용.
- **개선**: 실제 OG에 쓰이는 글자 범위로 서브셋(예: `subset-font`, KS X 1001 상용 한글 + 라틴)하면 수백 KB로 축소 가능 → 레포 경량화·설치 속도.
- **주의**: 서브셋이 미포함 글자를 만나면 두부(□) 발생 → 커버리지 넉넉히. **규모**: S

### B. heroImage 활용 정리 ⬜

- **현황**: 스키마에 `heroImage`가 있고 `PostLayout` 본문 상단에 렌더되지만, **OG는 생성 PNG를 우선** 사용(heroImage는 OG에 미사용).
- **정할 것**: heroImage가 있으면 OG로도 쓸지, 계속 생성 PNG로 통일할지 정책 확정 후 문서화.
- **규모**: S

### C. 이미지 파이프라인 점검 ⬜

- 실제 heroImage를 쓰는 글이 생기면 `astro:assets` 최적화(반응형 `widths`/`sizes`) 실측·조정.

---

## 콘텐츠 작성 워크플로 (참고)

일상 글쓰기는 아래로 충분하다. (별도 빌드 도구 불필요)

1. `src/content/posts/<slug>.md`(또는 `.mdx`) 생성
2. 프론트매터 작성 — `title`, `description`, `pubDate`, `tags`, (선택) `updatedDate`, `heroImage`, `draft`
   - 초안은 `draft: true` → 프로덕션 빌드에서 제외, 로컬 `pnpm dev`에선 보임
3. 로컬 확인: `pnpm dev`
4. 배포: `git add . && git commit && git push` → Cloudflare가 자동 빌드·배포
   - OG 이미지·RSS·사이트맵·태그 페이지는 **자동 생성**되므로 별도 작업 불필요

---

## 권장 착수 순서

1. **P1 전체** (ESLint/Prettier → CI → robots → JSON-LD) — 안전망부터
2. **Pagefind 검색** → **giscus 댓글** (독자 경험 체감 큼)
3. 이후 시리즈/i18n/애널리틱스는 실제 필요 시점에

> 각 항목은 독립적이라 순서 조정 가능. 콘텐츠 스키마를 바꾸는 작업(시리즈·i18n)은 착수 전 SPEC 5장을 먼저 갱신할 것.
