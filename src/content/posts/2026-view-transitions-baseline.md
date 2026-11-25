---
title: 'View Transitions 로 MPA가 다시 빨라진다'
description: 'View Transitions API 가 Baseline 이 되며 자바스크립트 없이 페이지 전환이 매끄러워졌습니다. 서버·MPA 로 가는 흐름.'
pubDate: 2026-07-06
updatedDate: 2026-11-25
tags: ['frontend', 'view-transitions', 'astro', 'performance']
draft: false
---

SPA가 MPA(여러 쪽으로 된 사이트)를 이긴 이유 중 하나는 "쪽을 옮길 때 화면이 하얗게 깜빡이지 않는다"였습니다. 부드러운 전환을 위해 라우팅과 상태를 클라이언트로 가져왔고, 그 대가로 번들과 하이드레이션 비용을 치렀습니다. 이제는 이 전환을 브라우저가 CSS 한 줄로 해 줍니다. 서버가 그린 쪽을 그대로 내려보내는 MPA도 자바스크립트 없이 전환을 얻을 수 있게 된 것입니다.

이 블로그는 Astro로 만든 완전 정적(SSG) MPA입니다. 이 글의 처음 버전에서는 "이 블로그는 아직 전환을 켜지 않았습니다"라고 썼습니다. 이번에 실제로 켜고, 정말 동작하는지와 비용을 확인했습니다.

## 바꾼 코드 — CSS 두 덩어리

```css
/* global.css */
@media (prefers-reduced-motion: no-preference) {
  @view-transition {
    navigation: auto;
  }
}
.site-header {
  view-transition-name: site-header;
}
```

```html
<!-- Header.astro — 머리글에 클래스 하나 -->
<header class="site-header border-b …"></header>
```

이것이 전부입니다. 라우터도, 스크립트도 더하지 않았습니다.

- **`@view-transition { navigation: auto; }`**: 같은 출처(같은 도메인) 링크로 옮길 때 브라우저가 이전 화면과 새 화면의 스냅샷을 찍어 겹쳐 페이드합니다. 이전 쪽과 새 쪽 **양쪽 모두**에 이 규칙이 있어야 합니다. 모든 쪽이 같은 CSS를 쓰므로 한 곳에 두면 됩니다.
- **`prefers-reduced-motion` 으로 감싼 이유**: 운영체제에서 "동작 줄이기"를 켠 사람에게는 전환을 아예 켜지 않습니다. 애니메이션만 끄는 방법도 있지만, 규칙 자체를 감싸면 그 사람에게는 예전과 똑같은 즉시 이동이 됩니다.
- **머리글에 이름을 준 이유**: 이름이 없으면 화면 전체가 하나의 스냅샷으로 페이드되어, 쪽마다 똑같은 머리글까지 흐려졌다 돌아옵니다. `view-transition-name`을 주면 머리글은 따로 떼어져 이전·새 위치를 잇는데, 두 쪽의 머리글이 같은 자리·같은 모양이라 제자리에 그대로 있는 것처럼 보이고 본문만 바뀝니다.

## 정말 일어나는지 확인하기

눈으로 보는 것만으로는 "전환이 됐다"와 "그냥 빨리 바뀌었다"를 구분하기 어렵습니다. 그래서 새 쪽이 처음 보일 때 나오는 `pagereveal` 이벤트를 잡았습니다. 문서 간 전환이 일어나면 이 이벤트의 `viewTransition` 속성에 전환 객체가 들어 있습니다.

```js
// Playwright 의 addInitScript 로 새 쪽이 그려지기 전에 심는다 (줄인 코드)
window.addEventListener('pagereveal', (e) => {
  window.__vt = e.viewTransition ? '전환 있음' : '전환 없음';
  e.viewTransition?.ready.then(() => {
    // 전환 중인 의사 요소 애니메이션과 길이
    window.__animations = document
      .getAnimations()
      .map((a) => `${a.effect.pseudoElement} ${a.effect.getTiming().duration}ms`);
  });
});
```

첫 화면에서 글 링크를 눌러 글 쪽으로 옮기며 확인한 결과입니다(로컬 `pnpm preview`, Playwright) "동작 줄이기"는 `prefers-reduced-motion: reduce` 를 켠 상태입니다.

| 브라우저    | 보통      | 동작 줄이기 |
| ----------- | --------- | ----------- |
| Chrome 158  | 전환 있음 | 전환 없음   |
| WebKit 27.2 | 전환 있음 | 전환 없음   |

두 엔진 모두 전환이 일어날 때 `root`(머리글을 뺀 화면 전체)와 `site-header` 두 묶음이 따로 잡혔고, 애니메이션 길이는 따로 정하지 않았을 때의 기본값인 250ms였습니다. WebKit 27.2는 Playwright가 내려받는 WebKit 빌드의 버전이라 Safari 버전 번호와는 다릅니다. Firefox도 확인하려 했지만 이 컴퓨터에 설치된 Playwright Firefox가 실행되지 않아 직접 보지 못했습니다. MDN 호환성 데이터(browser-compat-data)로는 Firefox가 같은 문서 전환(`document.startViewTransition`)은 144부터 지원하지만, 문서 간 전환(`@view-transition`)과 `pagereveal`은 아직 미리보기 판에만 있습니다. 문서 간 전환은 Chrome 126, Safari 18.2부터입니다. 지원하지 않는 브라우저는 규칙을 무시하고 예전처럼 바로 바뀌므로 깨지는 것은 없습니다.

## 비용과 부작용

- **자바스크립트: 0바이트.** 바꾼 파일은 CSS와 머리글 클래스뿐입니다.
- **CSS: 126바이트**(압축 전, 빌드된 CSS에서 두 규칙이 80·46바이트).
- **다크 모드**: 이 블로그는 `<head>`의 짧은 스크립트가 그리기 전에 `dark` 클래스를 붙입니다. 다크 모드로 바꾼 뒤 글로 옮겨 `pagereveal` 시점에 확인하니 새 쪽은 이미 `dark` 상태였습니다. 전환 중에 밝은 화면이 끼어드는 일은 없었습니다.
- **키보드**: 옮긴 쪽에서 첫 Tab은 여전히 "본문으로 건너뛰기" 링크로 갑니다. 첫 화면·글·소개 쪽을 1440·390px, 라이트·다크로 axe 검사했을 때 이 변경으로 생긴 위반은 없었습니다.
- **빨라지지는 않습니다.** 제목은 "빨라진다"지만, 이 기능은 쪽을 불러오는 시간을 줄이지 않습니다. 바뀌는 것은 화면이 넘어가는 모습입니다. 하얀 깜빡임 대신 이전 화면이 새 화면으로 겹쳐 넘어가므로 끊김이 덜 느껴집니다.

## 하지 않은 것 — 목록 제목이 글 제목으로 이어지는 효과

자주 보이는 예제는 목록의 썸네일이나 제목이 상세 쪽의 큰 제목으로 늘어나며 이어지는 효과입니다. 목록 쪽 카드 제목과 글 쪽 `<h1>`에 같은 `view-transition-name`을 주면 됩니다. 이번에는 넣지 않았습니다.

이름은 **한 쪽 안에서 고유**해야 합니다. Chrome 158에서 같은 이름을 두 요소에 주고 전환을 시작하면 `InvalidStateError`로 전환 전체가 취소됐고, 이름을 다르게 하면 정상으로 시작했습니다. 이 블로그의 첫 화면에는 같은 글이 시리즈 카드와 최근 글 목록에 함께 나올 수 있어, 글마다 이름을 붙이려면 어느 쪽에 붙일지부터 정해야 합니다. 그 정리 없이 붙이면 전환이 조용히 사라질 수 있어 페이드만 두었습니다.

Astro의 `<ClientRouter />`를 쓰면 클라이언트 라우터가 쪽 이동을 가로채서, 문서 간 전환을 지원하지 않는 브라우저에서도 전환을 보여 줄 수 있습니다. 대신 모든 쪽에 라우터 스크립트가 붙습니다. 글을 읽는 정적 블로그라 지원하지 않는 브라우저에서는 그냥 바로 넘어가는 쪽을 골랐습니다.

> 정리: 정적 MPA에 쪽 전환을 붙이는 비용은 CSS 126바이트였고, 지원하지 않는 브라우저와 동작 줄이기를 켠 사람에게는 예전과 똑같습니다. **기본은 브라우저에게 맡기고, 정말 필요할 때만 자바스크립트를** 더합니다.

---

**참고**

- [View Transition API 브라우저 지원 (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API#browser_compatibility)
- [@view-transition 브라우저 지원 (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition#browser_compatibility)
- [pagereveal 이벤트 (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagereveal_event)
