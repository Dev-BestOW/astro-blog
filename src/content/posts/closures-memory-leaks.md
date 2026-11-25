---
pubDate: 2026-07-07
updatedDate: 2026-11-25
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

반환한 핸들러는 `huge`를 쓰지 않지만, 같은 스코프의 다른 클로저(`log`)가 `huge`를 씁니다. V8(Chrome·Node)은 한 스코프에서 만든 클로저들이 변수를 담은 컨텍스트 하나를 함께 쓰기 때문에, `log`를 버려도 핸들러가 살아 있는 한 `huge`가 해제되지 않습니다. 어느 클로저도 쓰지 않는 변수는 붙잡히지 않는다는 뜻이기도 합니다. 직접 재 보면 차이가 분명합니다.

### 직접 재 보기

위 함수와, `log` 줄만 뺀 함수를 각각 따로 실행해 핸들러 5개를 보관한 뒤 힙 사용량을 비교했습니다. 측정 전후에 GC를 강제로 돌려(`--expose-gc`) 살아 있는 객체만 셉니다.

```js
// node --expose-gc closure.mjs [with|without] (줄인 코드)
function withoutLog() {
  const huge = new Array(1_000_000).fill('🐢');
  return function () {
    console.log('clicked');
  };
}

const make = process.argv[2] === 'without' ? withoutLog : makeHandler;
globalThis.gc();
const before = process.memoryUsage().heapUsed;
const handlers = [];
for (let i = 0; i < 5; i++) handlers.push(make());
globalThis.gc();
console.log((process.memoryUsage().heapUsed - before) / 1024 / 1024, 'MB');
```

Node 22.23.4에서 세 번씩 돌린 결과는 매번 같았습니다(핸들러 5개를 보관한 뒤의 힙 증가).

| 함수          | `log` | 힙 증가  |
| ------------- | ----- | -------- |
| `makeHandler` | 있음  | +38.1 MB |
| `withoutLog`  | 없음  | 0 MB     |

100만 칸 배열 하나가 약 7.6 MB이므로, `log`가 있으면 핸들러마다 배열 하나씩 그대로 붙잡혀 있다는 뜻입니다. 반환한 핸들러는 `huge`를 한 번도 쓰지 않는데도 그렇습니다.

함정이 하나 더 있습니다. 처음에는 한 함수 안에서 `if (mode === 'shared') { const log = … }`처럼 조건을 걸어 비교하려 했는데, 두 경우 모두 38 MB가 늘었습니다. V8은 실행 전에 코드를 읽으면서 "어떤 변수를 안쪽 함수가 쓰는가"를 정하므로, 실행되지 않는 분기에 있는 클로저도 변수를 붙잡게 만듭니다.

이 예처럼 한 스코프에서 클로저가 얽히는 경우보다 더 흔한 문제는 **핸들러 자체가 어딘가에 계속 등록되어 있을 때**입니다.

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
- **정리 코드를 항상 짝으로**: `addEventListener`↔`removeEventListener`, `setInterval`↔`clearInterval`. React라면 `useEffect`의 cleanup, 표준 API라면 [AbortController](/posts/abortcontroller/)로 리스너 여러 개를 한 번에 정리할 수 있습니다.
- **약한 참조**: 캐시엔 `WeakMap`(키 객체가 사라지면 값도 GC 대상)이나 `WeakRef`(대상을 가리키되 GC를 막지 않음)를 고려.

## 실제로 쓴 곳 — 등록과 해제를 한 함수에서

제가 만드는 디자인 시스템 [BestOW UI](https://bestow-ui.com/)는 OS의 라이트·다크 설정 변화를 듣는 리스너를 이렇게 등록합니다. React의 `useSyncExternalStore`에 넘기는 구독 함수로, **등록하는 함수가 해제 함수를 돌려줍니다.**

```ts
// packages/react/src/theme/useSystemTheme.ts (줄인 코드)
function subscribe(onChange: () => void) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}
```

해제 함수가 같은 클로저 안에서 `mql`과 `onChange`를 그대로 붙잡고 있으므로, "등록한 그 객체에서 그 함수를 뺀다"가 어긋날 수 없습니다. 컴포넌트가 사라지면 React가 이 해제 함수를 부릅니다. 폼의 `reset` 이벤트를 듣는 훅도 `useEffect`의 cleanup으로 같은 모양을 씁니다. 등록 코드를 쓸 때 해제 코드를 바로 옆에 함께 쓰는 습관이 위 네 가지 누수 중 1·2번을 막습니다.

> 클로저는 잘못이 없습니다. **"이 함수는 무엇을 붙잡고 있고, 언제 놓아주는가"**를 항상 한 쌍으로 생각하는 습관이 누수를 막습니다.
