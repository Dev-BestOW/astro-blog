---
pubDate: 2026-07-07
updatedDate: 2026-11-18
title: '클로저는 어떻게 메모리 누수가 되는가'
description: '클로저는 강력하지만, 무엇을 붙잡고 있는지 모르면 누수가 됩니다. SPA에서 흔한 누수 패턴과 진단법을 정리합니다.'
tags: ['javascript', 'performance']
---

클로저(closure)는 "함수 + 그 함수가 선언된 렉시컬 환경"입니다. 이 정의는 다 알지만, **"클로저가 살아 있는 한, 그것이 참조하는 변수도 GC되지 않는다"**는 함의는 자주 놓칩니다. 장수명 SPA에서 메모리 누수의 상당수가 여기서 나옵니다.

## 클로저가 붙잡는 것

```js
function makeHandler() {
  const huge = new Array(1_000_000).fill('🐢'); // 큰 데이터
  const log = () => console.log(huge.length); // huge를 쓰는 다른 클로저
  return function () {
    console.log('clicked'); // huge를 안 써도…
  };
}
```

반환한 핸들러는 `huge`를 쓰지 않지만, 같은 스코프의 다른 클로저(`log`)가 `huge`를 씁니다. V8(Chrome·Node)은 한 스코프에서 만든 클로저들이 변수를 담은 컨텍스트 하나를 함께 쓰기 때문에, `log`를 버려도 핸들러가 살아 있는 한 `huge`가 해제되지 않습니다. Node 22에서 이 함수를 다섯 번 불러 핸들러만 보관하면 힙이 약 200MB 늘었고, `log` 줄을 지우면 늘지 않았습니다. 어느 클로저도 쓰지 않는 변수는 붙잡히지 않는다는 뜻이기도 합니다. 더 흔한 문제는 **핸들러 자체가 어딘가에 계속 등록되어 있을 때**입니다.

## SPA에서 흔한 누수 4가지

**1. 제거하지 않은 이벤트 리스너**

```js
function mount(node, data) {
  const onClick = () => render(data); // data를 클로저로 붙잡음
  window.addEventListener('resize', onClick);
  // 언마운트 시 removeEventListener를 안 하면 onClick과 data가 계속 살아 있다
}
```

**2. 정리하지 않은 타이머**

```js
const timer = setInterval(() => poll(state), 1000);
// clearInterval(timer)를 안 하면 state가 계속 살아있음
```

**3. detached DOM 노드**: 이미 화면에서 지운 DOM을 자바스크립트 변수(또는 클로저)가 여전히 참조하면, 노드 트리 전체가 메모리에 남습니다.

**4. 무한히 자라는 캐시**: 클로저/모듈 스코프에 `Map`으로 캐시를 두고 eviction이 없으면 그냥 누수입니다.

## 진단과 방어

- **Chrome DevTools → Memory → Heap snapshot**: 스냅샷을 두 번 찍어 비교(Comparison)하면 안 사라진 객체가 보입니다. **"Detached"** 로 필터하면 분리된 DOM 노드를 찾을 수 있습니다.
- **Performance → Memory 체크박스**로 시간에 따른 힙 추세(GC로 내려간 바닥이 계속 올라가면 누수 의심).
- **정리 코드를 항상 짝으로**: `addEventListener`↔`removeEventListener`, `setInterval`↔`clearInterval`. React라면 `useEffect`의 cleanup, 표준 API라면 뒤에 소개할 `AbortController`.
- **약한 참조**: 캐시엔 `WeakMap`(키 객체가 사라지면 값도 GC 대상)이나 `WeakRef`(대상을 가리키되 GC를 막지 않음)를 고려.

> 클로저는 잘못이 없습니다. **"이 함수는 무엇을 붙잡고 있고, 언제 놓아주는가"**를 항상 한 쌍으로 생각하는 습관이 누수를 막습니다.
