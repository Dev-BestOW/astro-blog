# astro-blog — 프로젝트 안내 (세션 시작 시 필독)

Astro로 만든 개발 블로그. 정적 SSG → Cloudflare(Workers 정적 자산)로 배포.
**라이브**: https://jiwon-seok.com (Cloudflare Registrar 커스텀 도메인, apex)

## 먼저 읽을 것 (이 순서로)

1. **[docs/SPEC.md](docs/SPEC.md)** — 단일 기준(SSOT). 기술 스택·구조·결정·변경 이력. 무엇이 이미 되어 있는지 여기서 확인.
2. **[docs/ROADMAP.md](docs/ROADMAP.md)** — 남은 일만 둔다(끝난 항목 상세는 `docs/ROADMAP-HISTORY.md`). 사용자가 작업을 지정하지 않았을 때 여기서 고른다.
3. 광고는 [docs/ADS.md](docs/ADS.md), 예약 발행은 [content-queue/README.md](content-queue/README.md).

## 작업 규칙 (반드시 지킬 것)

- **답변은 한국어(해요체)로 한다.** 진행 안내·완료 보고도 예외 없음. 문서·주석도 한국어.
- **git commit / push 는 하지 않는다.** 사용자가 직접 한다. 작업이 끝나면 바뀐 파일과 확인 결과만 보고하고,
  **커밋 메시지를 추천한다** — [gitmoji](https://gitmoji.dev/) + 한국어 한 줄(여러 영역이면 짧은 본문 글머리표).
  자주 쓰는 것: ✨ 기능 · 🐛 버그 · ♻️ 리팩터링 · 📝 문서·글 · ♿️ 접근성 · 💄 UI 스타일 · ⚡️ 성능 · 🔧 설정 · 🔍️ SEO.
- 다음 단계를 시작하기 전에 앞 단계가 커밋·push 됐는지 확인한다(`git status`, `git log origin/main`).
- 작업을 마치면 **SPEC.md "변경 이력"(맨 위)에 한 줄** 추가. 결정·스키마가 바뀌면 SPEC 본문도 갱신,
  ROADMAP 항목이면 상태를 갱신하고, 끝나면 ROADMAP-HISTORY 로 옮긴다. **콘텐츠 스키마를 바꾸는 작업**은 착수 전 SPEC 5장(프론트매터)부터.
- 확인하지 않은 것을 됐다고 보고하지 않는다. 실패·건너뛴 단계는 그대로 적는다.
- **기록은 이 저장소에만** — 블로그 작업 기록(SPEC·ROADMAP)은 여기에 남기고 BestOW UI 저장소 문서에는 적지 않는다(반대도 같다).

## 명령어

pnpm 이 셸에 없으면 `corepack pnpm …` 으로 실행한다.

```bash
pnpm dev            # 로컬 개발 서버 (Pagefind 검색은 build 뒤 preview 에서만 동작)
pnpm build          # astro build → 본문 글꼴 줄이기 → pagefind (dist/, OG PNG·RSS·사이트맵 포함)
pnpm preview        # dist 를 로컬로 띄움 (브라우저 점검용)
pnpm check          # astro 타입체크
pnpm lint           # ESLint
pnpm format:check   # Prettier (pnpm format 으로 고침)
```

### 검증 (변경 후 항상 — 모두 통과해야 한다)

```bash
pnpm check && pnpm lint && pnpm format:check && pnpm build
```

CI(`.github/workflows/ci.yml`)는 **PR 과 main 이 아닌 브랜치에서만** 돈다. main 에 바로 push 하면 Cloudflare 빌드만 돌아
lint·서식 실패가 드러나지 않는다(2026-11-17 format:check 가 md 7개로 실패한 채 지나간 적 있음) — 그래서 로컬 검증이 필수다.

### 브라우저 점검 (화면을 바꿨을 때)

`pnpm build && pnpm preview` 로 띄우고 scratchpad 에서 Playwright(`channel: 'chrome'`, 시스템 Chrome)로 확인한다.

- **axe 위반 0**: 바꾼 쪽을 데스크톱(1440)·모바일(390) × 라이트·다크로. 기준 태그 `wcag2a·wcag2aa·wcag21aa·wcag22aa`.
- **가로 넘침 0**: 320·390px 에서 `document.documentElement.scrollWidth` ≤ 화면 폭.
- 스크린샷으로 눈으로도 본다(한글 줄바꿈·겹침·빈 공간은 검사로 안 잡힌다). 끝나면 preview 서버를 끈다.

## 화면·접근성 규칙

- 글자 대비 4.5:1 이상. 다크 배경의 보조 글자는 `dark:text-neutral-400`(neutral-500 은 4.17 로 미달), 라이트는 `text-neutral-600`
  (비활성 표시도 `text-neutral-500` 이상).
- 링크·버튼 누름 영역 24px 이상(WCAG 2.5.8). 작은 글자 링크는 `py-1 -my-1` 로 넓히고 줄 간격은 그대로(태그 링크 참고).
- 한글은 낱말 단위 줄바꿈 — `body` 에 `word-break: keep-all` 이 걸려 있다. 새 요소에서 끄지 않는다.
- 메뉴·제목 등 화면 글자는 한국어로(태그 이름은 검색용이라 영어 소문자).
- 이름이 없는 입력·아이콘 버튼은 `aria-label`. 외부 위젯(Pagefind·giscus)이 만든 요소도 확인한다.
- 코드 하이라이트는 Shiki 고대비 테마(`github-*-high-contrast`) — 기본 테마는 주석 대비가 모자란다.

## 배포 모델

- **main에 push하면 Cloudflare가 자동 빌드·배포** (프리뷰: PR). 빌드 실패해도 라이브는 직전 성공 배포를 유지.
- 로컬 CLI는 Cloudflare 미인증. 배포 결과는 GitHub check-run("Workers Builds: astro-blog")으로 확인:
  `curl -s https://api.github.com/repos/Dev-BestOW/astro-blog/commits/<sha>/check-runs`

## 반드시 지킬 것 (지뢰)

- **`wrangler.jsonc` 삭제/변경 금지** (assets-only, `main` 없음). 이게 없으면 `wrangler deploy`가
  `astro add cloudflare` 어댑터를 자동 주입 → workerd 프리렌더에서 `node:fs` 부재로 **빌드 실패**.
  (자세한 배경은 SPEC 변경 이력 참고)
- OG 생성(`src/lib/og.ts`)은 **빌드타임 전용**(`node:fs`로 폰트 읽음). 런타임/워커로 옮기지 말 것.
- 폰트 (둘 다 삭제 금지):
  - `src/assets/fonts/Pretendard-*.subset.woff`(정적 400/700) — **OG 렌더용**(빌드타임). 원본 OTF는 커밋 안 함(`.gitignore`). 재생성: OTF를 임시로 두고 `node scripts/subset-fonts.mjs`.
  - `src/assets/fonts/PretendardVariable.subset.woff2`(전 weight Variable) — **사이트 본문 웹폰트 원본**(`global.css` `@font-face`). 재생성: `pnpm add -D pretendard` 후 `node scripts/subset-body-font.mjs`(pretendard 패키지의 Variable woff2를 상용 글자로 서브셋).
    배포 빌드는 `scripts/subset-dist-font.mjs`(build 스크립트에 포함)가 dist 의 이 파일을 **사이트에 쓰인 글자 + 굵기 400~700** 만 남겨 다시 줄이고(630 → 약 116 kB), 내용 해시로 이름을 바꿔 CSS 참조를 고친다. 400~700 밖 굵기를 쓰려면 `global.css` font-weight 와 스크립트의 `weight` 를 함께 바꾼다.
- `SITE_URL`은 `src/config.ts`와 `astro.config.mjs`(그리고 도메인 변경 시 `wrangler.jsonc`) **세 곳을 일치**시킬 것.
- 도메인 설정(Cloudflare): `www` → 루트 301 규칙, Always Use HTTPS, **메일을 안 쓰는 도메인이라 SPF `-all`·DMARC `reject`** — 이 도메인으로 메일을 쓰게 되면 이 두 TXT 부터 바꾼다. Search Console 확인 TXT 는 지우지 않는다.
- **Prettier 는 md 안의 코드 블록을 건드리지 않게 해 두었다**(`.prettierrc.json` 의 `embeddedLanguageFormatting: off`).
  켜면 `pnpm format` 이 글 속 코드 예시의 줄바꿈·괄호까지 바꾼다(2026-11-17 확인). 글 파일 서식을 고칠 때는 고치기 전후 빌드 결과(글 HTML)를 비교한다.
- 광고·댓글·통계 등 외부 서비스를 더하거나 빼면 **개인정보처리방침(`src/pages/privacy.astro`)과 시행일**을 함께 고친다.
  광고 심사 중에는 `ads.txt`·소유 확인 메타를 바꾸지 않고, `/privacy/` 는 지우거나 주소를 바꾸지 않는다(내용을 사실에 맞게 고치는 것은 된다).
  방문 통계(Cloudflare Web Analytics)는 코드가 아니라 Cloudflare 설정으로 붙어 있다 — 끄거나 바꾸면 방침도 고친다.
- 소개 쪽(`/about/`)에는 공개 GitHub 연락처만 둔다 — 이메일·실명은 운영자가 정해서 넣는다.

## 글 쓰는 법

`src/content/posts/<slug>.md`(또는 `.mdx`) 추가 → 프론트매터(`title`,`description`,`pubDate`,`tags`, 선택 `draft`/`updatedDate`/`heroImage`/`series`/`seriesOrder`) → `git push`.
파일 이름이 주소가 된다(영어 kebab-case, 한글·공백 없음). 본문에 `# 제목` 줄은 쓰지 않는다(레이아웃이 그린다).
OG/RSS/사이트맵/태그는 자동 생성. 초안은 `draft: true`(프로덕션 제외).

- 본문은 **합니다체**. 태그는 영어 소문자(`'accessibility'`, `'react'` …).
- **숫자·사실·코드는 확인한 것만 쓴다.** 코드 조각은 실제 소스에서 가져오고(줄였으면 "줄인 코드" 라고 적는다), 측정하지 않은 효과는 쓰지 않는다.
- BestOW UI 글은 `series: 'BestOW UI 만들기'`. 링크는 검색 엔진이 읽는 사이트 쪽으로 —
  컴포넌트 `https://bestow-ui.com/components/<slug>/`, 함수 `https://bestow-ui.com/korean-utils/<slug>/`.
  Storybook(`https://bestow-ui.com/storybook/?path=…`)은 그곳에만 있는 것(KWCAG 대응 표·테마 빌더)에만. 옛 주소 `dev-bestow.github.io/BestOW-UI` 는 쓰지 않는다.

**검색 노출 (네이버 서치어드바이저 웹마스터 가이드 기준 — 2026-11-20 전체 검토, 새 글·대기열 글 모두)**

- **제목(`title`) 40자 이내** — 화면 h1 이자 검색 결과 제목. 사람들이 실제로 검색할 **한국어 낱말**을 앞쪽에 둔다
  (예: "자바스크립트 깊은 복사", "유효성 검사", "웹 접근성", "명도 대비", "INP와 FID 차이"). 영어 API 이름만으로 된 제목은 피한다.
- **설명(`description`) 80자 이내, 1~2문장** — 제목을 되풀이하지 않고 글이 푸는 문제·핵심 내용을. 본문에 실제로 있는 것만(숫자·API 이름은 본문과 대조).
- 같은 낱말을 제목·설명에서 **두 번 이상 쓰지 않는다**, 내용과 무관한 인기 검색어·낚시성 문구 금지(네이버 "웹 콘텐츠 스팸사례"의 키워드 반복·낚시성).
- **발행한 글의 제목은 자주 바꾸지 않는다** — "검색 노출만을 위해 제목을 자주 변경하면 불이익". 바꿨으면 SPEC 변경 이력에 남기고, Search Console·서치어드바이저로 결과를 본 뒤에만 다시 손댄다.
- 본문: 소제목으로 나누고, 핵심 정보는 이미지가 아닌 텍스트로, 이미지는 `alt`, 인용은 원문 링크. 직접 해 본 경험·측정값을 쓴다(가이드 "콘텐츠 작성 5원칙").
- 사이트 쪽: 쪽마다 고유한 title·description, 절대 주소 canonical, 없는 쪽은 404 상태, 사이트맵·RSS 는 같은 도메인 절대 주소. 새 쪽 유형을 만들면 이 기준으로 확인한다.

**예약 발행(매일 1편)**: `content-queue/`(컬렉션 밖)에 미리 쓴 글을 쌓아두면 `.github/workflows/daily-post.yml`이 매일 1편씩 `posts/`로 옮겨 발행(`scripts/publish-next.mjs`, 파일명 오름차순·선행 `NN-` 접두어는 slug에서 제거·`pubDate`는 발행일로 자동 갱신). 큐가 비면 무동작. 자세한 사용법은 `content-queue/README.md`.

- 큐 글은 빌드·검사 대상이 아니다. 넣기 전에 `posts/` 에 잠깐 복사(`pubDate` 추가)해 `pnpm check`·`pnpm build` 로 확인하고 복사본을 지운다.
- cron 은 00:00 UTC(09:00 KST)지만 **실제 실행은 4~5시간 늦다**(14시 KST 전후). 오전에 안 돈 것은 대개 지연이다 — 오후에 다시 본다.
  `curl -s "https://api.github.com/repos/Dev-BestOW/astro-blog/actions/runs?per_page=3"`
- 저장소에 60일 동안 활동이 없으면 GitHub 가 예약 워크플로를 끈다(2026-09~11 에 멈춘 적 있음). 다시 켜는 것은 사용자(Actions › Daily post › Enable workflow).
