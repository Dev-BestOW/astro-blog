---
pubDate: 2026-07-08
updatedDate: 2026-11-25
title: 'AbortController — 비동기 취소의 표준 도구'
description: 'fetch 취소만 알면 절반만 쓰는 겁니다. 리스너 정리·타임아웃·신호 결합까지 AbortController 실전 활용.'
tags: ['javascript', 'async', 'web-api']
---

`AbortController`는 "취소 가능한 작업"을 위한 웹 표준입니다. `fetch` 취소로 처음 접하지만, 실제로는 **이벤트 리스너 정리·타임아웃·여러 취소 신호 결합**까지 아우르는 범용 도구입니다.

## 기본 구조

`AbortController`는 `signal` 하나를 들고 있고, `controller.abort()`를 호출하면 그 signal이 "중단됨" 상태가 됩니다. 작업 쪽은 이 signal을 구독합니다.

```js
const controller = new AbortController();
fetch('/api/data', { signal: controller.signal })
  .then((r) => r.json())
  .catch((err) => {
    if (err.name === 'AbortError') return; // 취소는 정상 흐름
    throw err;
  });

controller.abort(); // 요청 취소
```

`abort()`로 취소하면 `AbortError`가 던져지므로, 진짜 실패와 구분해서 처리해야 합니다. 다만 **에러 이름이 늘 `AbortError`인 것은 아닙니다.** 아래 "에러 이름은 하나가 아니다"에서 직접 확인한 결과를 봅니다.

## 잘 안 쓰는 강력한 용도 — 리스너 일괄 정리

`addEventListener`는 세 번째 인자로 `signal`을 받습니다. **signal이 abort되면 그 리스너가 자동으로 제거됩니다.** 여러 리스너를 하나의 컨트롤러로 한 번에 정리할 수 있습니다.

```js
const controller = new AbortController();
const { signal } = controller;

window.addEventListener('resize', onResize, { signal });
document.addEventListener('keydown', onKey, { signal });
el.addEventListener('click', onClick, { signal });

// 언마운트 시 이 한 줄이면 위 세 개가 전부 제거됨
controller.abort();
```

수동 `removeEventListener` 짝맞추기(그리고 그로 인한 누수)에서 해방됩니다. 리스너를 지우지 않아 생기는 누수는 [클로저 메모리 누수](/posts/closures-memory-leaks/) 글에서 측정해 봤습니다.

Chrome 158에서 위 세 리스너(`resize`·`keydown`·`click`)를 등록하고 이벤트를 직접 일으켜 보면, `abort()` 전에는 3번 불리고 뒤에는 0번 불립니다. Node 22의 `EventTarget`에서는 하나를 더 확인했습니다. **이미 abort된 signal로 등록하면 리스너가 아예 붙지 않습니다.** 컨트롤러를 다시 쓰려면 새로 만들어야 합니다.

## 타임아웃과 신호 결합

- **`AbortSignal.timeout(ms)`**: 지정 시간이 지나면 자동으로 중단되는 signal을 만듭니다.
- **`AbortSignal.any([a, b])`**: 여러 signal 중 하나라도 abort되면 중단되는 결합 signal을 만듭니다. (비교적 최근에 추가된 API라 타겟 브라우저 지원은 확인 필요)

```js
// "5초 타임아웃" 또는 "사용자 취소" 중 먼저 오는 쪽으로 중단
const userCancel = new AbortController();
const signal = AbortSignal.any([userCancel.signal, AbortSignal.timeout(5000)]);
await fetch('/api/slow', { signal });
```

## 에러 이름은 하나가 아니다

응답하지 않는 요청에 `fetch`를 걸고 세 가지 방법으로 끊어서, 던져진 에러를 Chrome 158과 Node 22.23.4에서 확인했습니다. 결과는 두 곳이 같았습니다. `timeout`·`any`는 `AbortSignal.timeout(50)`, 그리고 사용자 취소 signal과 그것을 묶은 `AbortSignal.any([…])`입니다.

| 끊는 방법                  | `err.name`     |
| -------------------------- | -------------- |
| `abort()`                  | `AbortError`   |
| `timeout(50)`              | `TimeoutError` |
| `any([…])`                 | `TimeoutError` |
| `abort(new Error('닫음'))` | `Error`        |

시간 초과는 `TimeoutError`이고, `abort()`에 이유를 넘기면 그 값이 그대로 던져집니다. 그래서 `if (err.name === 'AbortError') return` 만으로 걸러 내면, **위 타임아웃 예제는 시간이 지났을 때 진짜 실패처럼 처리됩니다.** 이름 대신 signal 상태를 보는 편이 안전합니다.

```js
try {
  await fetch('/api/slow', { signal });
} catch (err) {
  if (err.name === 'TimeoutError') return showTimeoutMessage(); // 시간 초과는 따로 알리고 싶을 때
  if (signal.aborted) return; // 그 밖의 취소는 정상 흐름
  throw err;
}
```

## React에서

`useEffect` cleanup과 궁합이 좋습니다.

```js
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(/* … */)
    .catch((e) => {
      if (e.name !== 'AbortError') setError(e);
    });
  return () => controller.abort(); // 언마운트/의존성 변경 시 취소
}, [url]);
```

여기서는 cleanup이 이유 없이 `abort()`만 부르므로 `AbortError` 검사로 충분합니다. 타임아웃을 함께 걸면 위처럼 `TimeoutError`도 따로 처리해야 합니다.

> "정리(cleanup)"가 필요한 모든 비동기·구독에 `AbortController`를 떠올리세요. fetch 전용 도구가 아니라 **취소의 공통 언어**입니다.
