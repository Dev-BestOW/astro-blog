---
title: 'MPA가 다시 빨라진다 — 2026년 View Transitions와 "적게 보내기"의 귀환'
description: 'View Transitions API가 Baseline에 오르면서, 자바스크립트 없이도 페이지 전환이 SPA처럼 매끄러워졌습니다. 2026년 프론트엔드가 다시 서버·MPA로 무게추를 옮기는 흐름을 정리합니다.'
pubDate: 2026-07-06
tags: ['frontend', 'view-transitions', 'astro', 'performance']
draft: false
---

지난 10년, 프론트엔드의 기본값은 SPA였습니다. "부드러운 전환"을 위해 라우팅과 상태를 전부 클라이언트로 가져왔고, 그 대가로 무거운 번들과 하이드레이션 비용을 치렀죠. 2026년의 흐름은 반대 방향입니다. **브라우저가 기본으로 잘하게 되면서, 그 일을 자바스크립트에서 브라우저로 되돌려주는** 중입니다. 그 중심에 View Transitions API가 있습니다.

## SPA를 흉내 내던 이유가 사라졌다

MPA(다중 페이지 앱)의 오래된 약점은 "페이지가 하얗게 깜빡인다"였습니다. SPA가 이겼던 진짜 이유의 상당 부분이 여기에 있었죠. 이제 이 문제가 브라우저 표준으로 풀렸습니다.

- **같은 문서(SPA형) 전환**은 이미 Baseline Newly Available입니다 — Chrome/Edge 111+, Firefox 133+, Safari 18+.
- **문서 간(MPA) 전환**은 CSS 한 줄로 켜집니다 — Chrome 126+, Safari 18.2+ 지원(Firefox는 아직).

핵심은 문서 간 전환이 **자바스크립트 0바이트**로 동작한다는 점입니다. 라우터도, 프레임워크도 필요 없습니다.

```css
/* 이것만으로 일반 링크 네비게이션에 크로스페이드가 붙는다 */
@view-transition {
  navigation: auto;
}
```

요소를 이어지게(morph) 만들고 싶으면 전환 전후 페이지에서 같은 이름만 붙여주면 됩니다.

```css
/* 목록의 썸네일 → 상세의 히어로 이미지로 자연스럽게 이어짐 */
.hero-image {
  view-transition-name: hero;
}
```

브라우저가 전환 직전/직후의 스냅샷을 찍어 그 사이를 애니메이션합니다. 우리가 프레임을 계산하지 않습니다.

## "적게 보내기"가 다시 이기고 있다

View Transitions는 더 큰 흐름의 한 조각입니다. 2026년 프론트엔드의 무게추는 세 곳에서 동시에 서버·브라우저 쪽으로 이동하고 있습니다.

1. **View Transitions** — 전환 애니메이션을 JS에서 브라우저로.
2. **React Server Components** — 렌더링과 데이터 페칭을 클라이언트에서 서버로. 클라이언트로 내려보내는 JS 자체를 줄입니다.
3. **Signals(세밀한 반응성)** — Angular는 4월 기준 zoneless가 기본이 됐고, Svelte 5·Solid·Vue가 같은 원시 개념을 공유합니다. 컴포넌트 트리 전체를 dirty-check 하는 대신 바뀐 것만 갱신합니다.

React Compiler가 `useMemo`/`useCallback`을 손으로 짜던 시대를 끝내고 있는 것도 같은 맥락입니다 — **개발자가 최적화를 외우는 대신, 도구가 기본으로 최적화**합니다. 공통 주제는 하나입니다. *클라이언트에 보내는 자바스크립트를 줄여라.*

## 이 블로그의 관점

이 사이트는 애초에 이 방향으로 만들어졌습니다. Astro로 **완전 정적(SSG)**, 프레임워크 없는 순수 MPA, 클라이언트 JS는 다크모드 토글과 TOC 하이라이트 정도가 전부입니다. 몇 년 전이면 "그럼 전환이 투박하지 않나?"가 정당한 반문이었지만, 지금은 CSS 몇 줄로 메웁니다.

정리하면 선택지는 이렇습니다.

- **네이티브 크로스도큐먼트 전환** — `@view-transition { navigation: auto; }`. JS 0바이트, 순정 MPA 그대로. 대신 Firefox는 아직 그냥 즉시 전환(우아한 저하).
- **Astro `<ClientRouter />`** — 클라이언트 라우터를 얹어 모든 브라우저에서 SPA형 전환·상태 유지를 얻는 대신, 약간의 JS를 감수.

정적 콘텐츠 블로그라면 전자로 충분합니다. 지원 안 되는 브라우저는 애니메이션만 빠지고 내용은 멀쩡하니까요. **"기본은 브라우저에게, 정말 필요할 때만 JS를"** — 이게 2026년에 다시 정답이 된 오래된 원칙입니다.

## 언제 도입할까

- **지금 도입** — 정적/콘텐츠 중심 사이트의 크로스도큐먼트 전환. 비용이 CSS 몇 줄이고 저하가 안전합니다.
- **지켜보기** — 복잡한 앱의 상태 보존형 SPA 전환. 프레임워크 라우터 통합이 성숙 중입니다.
- **아직 아님** — Firefox 크로스도큐먼트 지원을 전제로 한 필수 UX. 아직 폴백을 항상 준비해야 합니다.

> 트렌드는 순환합니다. 하지만 이번엔 유행이 아니라 **브라우저 플랫폼 자체가 좋아져서** 무게추가 돌아온 겁니다. 프레임워크 없이도 충분한 일이 점점 늘어납니다.

---

**참고**

- [Frontend trends 2026: adopt now, watch, or skip (Netguru)](https://www.netguru.com/blog/front-end-trends)
- [2026 Frontend Framework War: Signals Won (DEV)](https://dev.to/linou518/2026-frontend-framework-war-signals-won-react-is-living-off-its-ecosystem-2dki)
- [10 Frontend Performance Trends in 2026](https://www.alphonsolabs.com/frontend-performance-trends-2026/)
