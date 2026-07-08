---
pubDate: 2026-07-08
title: 'AbortController — 비동기 취소의 표준 도구'
description: 'fetch 취소로만 알고 있다면 절반만 쓰는 겁니다. 리스너 정리, 타임아웃, 신호 결합까지 AbortController의 실전 활용을 정리합니다.'
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

취소 시 던져지는 에러는 `AbortError`라, 진짜 실패와 구분해서 처리해야 합니다.

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

수동 `removeEventListener` 짝맞추기(그리고 그로 인한 누수)에서 해방됩니다.

## 타임아웃과 신호 결합

- **`AbortSignal.timeout(ms)`**: 지정 시간이 지나면 자동으로 중단되는 signal을 만듭니다.
- **`AbortSignal.any([a, b])`**: 여러 signal 중 하나라도 abort되면 중단되는 결합 signal을 만듭니다. (비교적 최근에 추가된 API라 타겟 브라우저 지원은 확인 필요)

```js
// "5초 타임아웃" 또는 "사용자 취소" 중 먼저 오는 쪽으로 중단
const userCancel = new AbortController();
const signal = AbortSignal.any([userCancel.signal, AbortSignal.timeout(5000)]);
await fetch('/api/slow', { signal });
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

> "정리(cleanup)"가 필요한 모든 비동기·구독에 `AbortController`를 떠올리세요. fetch 전용 도구가 아니라 **취소의 공통 언어**입니다.
