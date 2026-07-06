# astro-blog — 프로젝트 안내 (세션 시작 시 필독)

Astro로 만든 개발 블로그. 정적 SSG → Cloudflare(Workers 정적 자산)로 배포.
**라이브**: https://astro-blog.dev-bestow.workers.dev

## 먼저 읽을 것 (이 순서로)

1. **[docs/SPEC.md](docs/SPEC.md)** — 단일 기준(SSOT). 기술 스택·구조·결정·변경 이력. 무엇이 이미 되어 있는지 여기서 확인.
2. **[docs/ROADMAP.md](docs/ROADMAP.md)** — 남은 작업 백로그(P1→P3 + 기술부채). **다음 작업은 여기서 고른다.**

## 작업 진행 프로토콜

- 새 작업은 원칙적으로 ROADMAP의 **P1부터** 우선(사용자가 다른 항목을 지정하면 그걸 우선).
- 착수 → ROADMAP 해당 항목 상태를 🟡, 완료 → ✅로 갱신.
- 완료 시 **SPEC.md "변경 이력"에 한 줄** 추가. 결정/스키마가 바뀌면 SPEC 본문도 갱신.
- **콘텐츠 스키마를 바꾸는 작업**(시리즈·i18n 등)은 착수 전 SPEC 5장(프론트매터)부터 갱신.

## 명령어

```bash
pnpm dev      # 로컬 개발 서버
pnpm build    # 정적 빌드 (dist/) — OG PNG·RSS·사이트맵 자동 생성
pnpm check    # astro 타입체크 (완료 전 필수, 0 errors 유지)
```

## 배포 모델

- **main에 push하면 Cloudflare가 자동 빌드·배포** (프리뷰: PR).
- 로컬 CLI는 Cloudflare 미인증. 배포 성공/실패는 GitHub check-run으로 확인:
  `gh api repos/Dev-BestOW/astro-blog/commits/<sha>/check-runs`
- 빌드 실패해도 라이브는 직전 성공 배포를 유지(무중단).

## 반드시 지킬 것 (지뢰)

- **`wrangler.jsonc` 삭제/변경 금지** (assets-only, `main` 없음). 이게 없으면 `wrangler deploy`가
  `astro add cloudflare` 어댑터를 자동 주입 → workerd 프리렌더에서 `node:fs` 부재로 **빌드 실패**.
  (자세한 배경은 SPEC 변경 이력 참고)
- OG 생성(`src/lib/og.ts`)은 **빌드타임 전용**(`node:fs`로 폰트 읽음). 런타임/워커로 옮기지 말 것.
- 폰트 (둘 다 삭제 금지):
  - `src/assets/fonts/Pretendard-*.subset.woff`(정적 400/700) — **OG 렌더용**(빌드타임). 원본 OTF는 커밋 안 함(`.gitignore`). 재생성: OTF를 임시로 두고 `node scripts/subset-fonts.mjs`.
  - `src/assets/fonts/PretendardVariable.subset.woff2`(전 weight Variable) — **사이트 본문 웹폰트**(`global.css` `@font-face`). 재생성: `pnpm add -D pretendard` 후 `node scripts/subset-body-font.mjs`(pretendard 패키지의 Variable woff2를 상용 글자로 서브셋).
- `SITE_URL`은 `src/config.ts`와 `astro.config.mjs`(그리고 도메인 변경 시 `wrangler.jsonc`) **세 곳을 일치**시킬 것.

## 글 쓰는 법

`src/content/posts/<slug>.md`(또는 `.mdx`) 추가 → 프론트매터(`title`,`description`,`pubDate`,`tags`, 선택 `draft`/`updatedDate`/`heroImage`) → `git push`. OG/RSS/사이트맵/태그는 자동 생성. 초안은 `draft: true`(프로덕션 제외).
