# Astro 개발 블로그 — 프로젝트 스펙 (v1)

> 이 문서는 프로젝트의 단일 기준(Single Source of Truth)입니다.
> 모든 작업은 이 스펙을 먼저 참고한 뒤 진행합니다. 결정이 바뀌면 이 문서를 갱신합니다.

- **작성일**: 2026-07-06
- **상태**: 확정 (v1 / MVP)
- **런타임**: Node 25, pnpm 10

---

## 1. 핵심 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| 배포 | **Cloudflare (Git 연동)** | 정적 SSG, main push 시 자동 배포 |
| 배포 URL | **https://astro-blog.dev-bestow.workers.dev** | GitHub `Dev-BestOW/astro-blog` 연동 |
| 렌더링 | **완전 정적 (SSG)** `output: 'static'` | 어댑터 불필요 |
| UI 방향 | **미니멀** | 타이포/여백 중심, 다크모드 |
| 인터랙션 | **순수 Astro (프레임워크 없음)** | 필요 시 순수 `<script>`만 사용 |

---

## 2. 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Astro 5.x |
| 언어 | TypeScript (strict) |
| 콘텐츠 | Content Collections + MDX |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite`) |
| 코드 하이라이팅 | Shiki (Astro 내장, 빌드타임) |
| 이미지 | `astro:assets` (빌드타임 최적화) |
| 피드/사이트맵 | `@astrojs/rss`, `@astrojs/sitemap` |
| OG 이미지 | satori (자동 생성) |
| 패키지 매니저 | pnpm |

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
- [ ] 검색 (Pagefind — 정적 클라이언트 검색, CF Pages와 궁합 좋음)
- [ ] 댓글 (giscus)
- [ ] 시리즈/연재 그룹핑
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
// src/content/config.ts
title: string
description: string
pubDate: Date
updatedDate?: Date
tags: string[]
draft: boolean = false        // true면 빌드에서 제외
heroImage?: image()
```

---

## 6. 품질 / 운영

- ESLint + Prettier
- `astro check` (타입 검사)
- (선택) GitHub Actions: PR 시 `astro check` + 빌드 검증
- Lighthouse 목표: Performance / SEO / Accessibility **95+**

### 배포 파이프라인
1. 로컬 `pnpm build` → `dist/` 정적 산출물
2. Cloudflare Pages에 GitHub 레포 연결
   - 빌드 명령: `pnpm build`
   - 출력 디렉터리: `dist`
   - 자동 프리뷰(PR) / 프로덕션(main) 배포

---

## 7. 마일스톤

| 단계 | 내용 | 상태 |
|------|------|------|
| **M1 스캐폴딩** | 프로젝트 생성, Tailwind/MDX/컬렉션 스키마, 레이아웃 골격 | ✅ |
| **M2 콘텐츠** | 목록/상세/태그 페이지, TOC, 읽기시간, 코드 하이라이팅 | ✅ (기본 완료, 페이지네이션 미구현) |
| **M3 SEO/피드** | RSS, 사이트맵, OG 이미지, 다크모드 | 🟡 (RSS·사이트맵·다크모드·OG메타 완료 / OG 이미지 satori 자동생성 미구현) |
| **M4 배포** | Cloudflare 연결, Lighthouse 95+ 확인 | ✅ (A11y·SEO·BestPractices 100, LCP 130ms/CLS 0) |
| **v2 백로그** | Pagefind 검색, giscus 댓글, 시리즈 | ⬜ |

---

## 변경 이력
- 2026-07-06: v1 스펙 확정 (Cloudflare Pages / 미니멀 UI / 순수 Astro).
- 2026-07-06: M1 스캐폴딩 완료. Astro 7 + Tailwind v4 + MDX + Content Collections(glob loader) 구성. 목록/상세/태그/RSS/사이트맵/다크모드/OG메타/404 페이지 구현, `astro check` 0 errors, `pnpm build` 성공.
- 2026-07-06: M4 배포 연결 완료. Cloudflare Git 연동, main push 시 자동 재배포 검증(~84초). 배포 URL을 workers.dev 도메인으로 확정하고 canonical/OG/RSS/sitemap 전부 반영. `.nvmrc`(22)·`packageManager` 고정.
- 2026-07-06: Lighthouse 측정 및 접근성 수정. muted 텍스트 대비(neutral-500 on dark = 4.17)가 WCAG AA 미달 → neutral-600/dark:neutral-400로 상향. 재측정 결과 Accessibility·SEO·Best Practices·Agentic 100/0-failed, 성능 LCP 130ms·CLS 0.00·TTFB 58ms. M4 완료.
