---
title: 'Hello, World — 블로그를 시작합니다'
description: 'Astro로 만든 개발 블로그의 첫 글입니다. 스택과 앞으로의 계획을 간단히 소개합니다.'
pubDate: 2026-07-06
tags: ['astro', 'blog']
draft: false
---

첫 글입니다. 이 블로그는 **Astro**로 만들어졌고, 정적으로 빌드되어 Cloudflare Pages에 배포됩니다.

## 왜 Astro인가

콘텐츠 중심 사이트에 최적화되어 있고, 기본적으로 클라이언트 JavaScript를 거의 보내지 않습니다. 덕분에 로딩이 빠릅니다.

- Markdown / MDX로 글 작성
- 빌드타임 코드 하이라이팅(Shiki)
- 이미지 자동 최적화

## 코드 예시

```ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('world'));
```

## 앞으로

검색(Pagefind), 댓글(giscus), 시리즈 기능을 v2에서 추가할 예정입니다. 자세한 내용은 저장소의 `docs/SPEC.md`를 참고하세요.

> 꾸준히 기록하는 것이 목표입니다.
