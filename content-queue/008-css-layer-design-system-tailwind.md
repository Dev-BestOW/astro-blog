---
title: 'CSS @layer 로 Tailwind 우선순위 충돌 없애기'
description: 'className 으로 고치다 !important 로 끝난다면 @layer 가 답입니다. 레이어로 감싼 과정과 Tailwind v4 설정.'
tags: ['css', 'design-system', 'tailwind']
series: 'BestOW UI 만들기'
draft: false
---

UI 라이브러리의 버튼을 조금 고치고 싶을 때가 있습니다. `className="px-8"` 을 줬는데 안 먹습니다. 라이브러리 CSS 의 선택자가 더 구체적이거나, 나중에 불러왔기 때문입니다. 결국 선택자를 길게 쓰거나 `!important` 를 붙이게 됩니다.

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 는 2.0 에서 모든 스타일을 CSS 레이어 `bestow` 안에 넣었습니다. 이 글은 그렇게 하며 얻은 것과 치른 비용입니다.

## 레이어 밖 CSS 는 항상 이긴다

`@layer` 의 규칙은 단순합니다. **레이어 밖(unlayered)에 쓴 CSS 는 레이어 안의 CSS 를 선택자 우선순위와 관계없이 이깁니다.** 레이어끼리는 먼저 선언한 레이어가 약합니다.

라이브러리 스타일 전체를 레이어로 감싸 두면, 사용자가 레이어 밖에 쓰는 CSS(일반 CSS, CSS Modules, Tailwind 유틸리티)는 클래스 하나로도 컴포넌트를 덮습니다.

```css
@layer base, bestow;
@layer bestow {
  /* 컴포넌트 스타일 전체 */
}
```

```css
/* 사용자 CSS — 레이어 밖. 선택자가 더 약해도 이긴다 */
.my-button {
  border-radius: 0;
}
```

## 비용: 리셋 CSS 도 컴포넌트를 이긴다

같은 규칙이 반대 방향으로도 작동합니다. **레이어 밖에 있는 리셋 CSS** 도 컴포넌트를 이깁니다. normalize.css, 직접 쓴 `button { padding: 0; background: none }`, Tailwind v3 의 preflight 가 레이어 밖에 있으면 버튼의 여백·배경·테두리가 사라집니다.

1.x 에서는 컴포넌트 CSS 가 리셋보다 구체적이어서 이겼는데, 레이어로 감싸면 이 관계가 뒤집힙니다. 기존 사용자의 화면이 바뀔 수 있는 변경이라 **major(2.0)** 로 냈고, 마이그레이션 문서에 확인할 곳과 고치는 법을 적었습니다.

- 직접 쓴 리셋: `@layer base { … }` 로 감쌉니다. 파일은 `@import url('normalize.css') layer(base);`.
- Tailwind v3: `corePlugins: { preflight: false }` 로 끄고 필요한 리셋만 `base` 레이어에, 또는 v4 로 올립니다.

## 앞에 한 줄 더: `@layer base, bestow;`

레이어 순서는 **처음 선언한 순서**로 정해집니다. 그래서 CSS 맨 앞에 `@layer base, bestow;` 를 함께 넣었습니다. 이렇게 하면 `base` 레이어(Tailwind v4 의 preflight 가 들어가는 곳)는 어느 쪽을 먼저 불러오든 BestOW 보다 약합니다. 리셋이 `base` 레이어 안에만 있으면 컴포넌트를 덮지 않습니다.

## Tailwind v4 와 함께 쓰는 한 줄

Tailwind v4 의 `@import 'tailwindcss';` 는 `theme`·`base`·`components`·`utilities` 레이어를 만듭니다. 전역 CSS 맨 위에 순서를 적으면 **preflight 는 BestOW 보다 약하고, 유틸리티 클래스는 BestOW 보다 강해집니다.**

```css
/* globals.css */
@layer theme, base, bestow, components, utilities;
@import 'tailwindcss';
```

```tsx
<Button className="rounded-none px-8">저장</Button> // 유틸리티가 이긴다
```

이 줄이 없어도 preflight 는 BestOW 를 덮지 않습니다(앞의 `@layer base, bestow;` 덕분). 다만 BestOW CSS 를 Tailwind 보다 나중에 불러오면 `bestow` 가 마지막 레이어가 되어 유틸리티가 컴포넌트를 이기지 못합니다. 순서 한 줄을 적으면 불러오는 순서와 관계없이 원하는 대로 됩니다. `!important` 는 필요 없습니다.

CSS 변수(`--bestow-*`)로 테마 색을 바꾸는 것도 같습니다. 변수도 레이어 안에서 정의되므로 레이어 밖에서 `:root { --bestow-color-primary-solid: #7c3aed; }` 처럼 덮으면 그대로 이깁니다.

## vanilla-extract 에는 레이어 옵션이 없어서, 빌드 결과를 감쌌다

컴포넌트 스타일은 vanilla-extract(`.css.ts`)로 씁니다. 파일마다 레이어를 지정하는 대신, **만들어진 CSS 전체를 한 번에 감싸는 함수**를 두고 빌드와 Storybook 이 같은 함수를 쓰게 했습니다(실제 코드).

```ts
export const CSS_LAYER = 'bestow';

const prelude = `@layer base, ${CSS_LAYER};\n@layer ${CSS_LAYER} {\n`;

/** 소스맵이 맞도록 앞에 넣은 줄 수 — 소스맵 mappings 앞에 이만큼 `;` 를 붙인다 */
export const LAYER_PRELUDE_LINES = prelude.split('\n').length - 1;

/** CSS 전체를 레이어로 감싼다. 끝의 `sourceMappingURL` 주석은 레이어 밖에 남긴다. */
export function wrapInLayer(css: string): string {
  const match = /\/\*# sourceMappingURL=[^*]*\*\/\s*$/.exec(css);
  const body = match ? css.slice(0, match.index) : css;
  return `${prelude}${body.replace(/\s*$/, '')}\n}\n${match ? match[0].trim() + '\n' : ''}`;
}
```

- 배포 빌드(tsup)는 `dist/index.css` 를 이 함수로 감싸고, 앞에 넣은 줄 수만큼 소스맵을 밀어 줍니다.
- Storybook 은 Vite 플러그인에서 vanilla-extract 가 만든 CSS 를 같은 함수로 감쌉니다. 그래서 **문서에서 보는 화면과 실제 설치한 화면이 같습니다.**

## 확인한 것

- E2E 3개: 컴포넌트 스타일이 `@layer bestow` 안에 있는지, 레이어 밖의 더 약한 선택자가 이기는지, `base` 레이어 리셋은 나중에 불러와도 이기지 못하는지.
- 각 테스트는 구현을 일부러 빼서 실패하는지 확인했습니다(Storybook 플러그인, 빌드 감싸기, 레이어 순서).
- Storybook 문서 쪽은 스토리 테스트 대상이 아니라서 따로 확인했습니다. 레이어를 그대로 둔 빌드와 레이어를 `@media all` 로 바꾼 빌드를 만들어 문서 62쪽을 라이트·다크로 찍어(124장) 비교했고, 픽셀 차이는 0이었습니다.
- 브라우저 지원: `@layer` 는 Chrome·Edge 99, Firefox 97, Safari 15.4 부터입니다.

## 정리

- 라이브러리 CSS 를 레이어로 감싸면 사용자는 **클래스 하나로** 덮을 수 있습니다. 선택자 싸움과 `!important` 가 사라집니다.
- 대신 레이어 밖 **리셋 CSS 도 이깁니다**. 기존 화면이 바뀔 수 있으니 major 로 내고, 리셋을 `@layer base` 로 옮기는 법을 안내합니다.
- 앞에 `@layer base, 라이브러리;` 를 함께 두면 리셋 레이어는 늘 라이브러리보다 약합니다.
- Tailwind v4 는 `@layer theme, base, bestow, components, utilities;` 한 줄이면 됩니다.

자세한 설정은 BestOW UI 의 [Tailwind 와 함께 쓰기 가이드](https://bestow-ui.com/storybook/?path=/docs/guides-tailwind-%EC%99%80-%ED%95%A8%EA%BB%98-%EC%93%B0%EA%B8%B0--docs)에 있습니다.
