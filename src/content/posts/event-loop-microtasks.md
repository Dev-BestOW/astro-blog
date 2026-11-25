---
pubDate: 2026-07-06
updatedDate: 2026-11-25
title: '이벤트 루프 다시 보기 — 태스크와 마이크로태스크'
description: 'setTimeout 과 Promise 실행 순서는 왜 다를까. 마이크로태스크 큐 동작으로 자바스크립트 비동기 순서를 정리합니다.'
tags: ['javascript', 'async']
---

"자바스크립트는 싱글 스레드"라는 말은 자주 듣지만, **마이크로태스크 큐**가 언제 비워지는지까지 따져 보는 경우는 드뭅니다. 이걸 알면 `await` 순서, React 상태 배칭, 이벤트 핸들러 타이밍이 전부 한 그림으로 보입니다.

## 두 개의 큐

이벤트 루프는 한 번의 "틱"마다 이렇게 움직입니다.

1. **태스크(매크로태스크) 하나**를 꺼내 실행 (콜 스택이 빌 때까지)
2. 그 후 **마이크로태스크 큐를 전부 비운다** (비우는 도중 새로 추가된 마이크로태스크도 포함)
3. 필요하면 렌더링
4. 다음 태스크로

- **태스크**: `setTimeout`/`setInterval`, I/O, 사용자 이벤트, `MessageChannel`
- **마이크로태스크**: `Promise`의 `.then`/`catch`/`finally`, `await` 이후, `queueMicrotask`, `MutationObserver`

핵심은 **"한 태스크가 끝나면 다음 태스크로 넘어가기 전에 마이크로태스크를 몽땅 비운다"**는 것입니다.

## 순서를 맞혀 보기

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 출력: 1 → 4 → 3 → 2
```

`setTimeout(…, 0)`이 0ms인데도 `3`보다 늦는 이유 — `2`는 **다음 태스크**로 예약되고, `3`은 **현재 태스크가 끝난 직후 마이크로태스크**로 먼저 처리되기 때문입니다.

## async/await는 마이크로태스크다

`await`는 문법 설탕일 뿐, 뒤따르는 코드는 `.then` 콜백과 동일하게 마이크로태스크로 스케줄됩니다.

```js
async function run() {
  console.log('a');
  await null; // 여기서 함수가 '일시정지' → 나머지는 마이크로태스크로
  console.log('b');
}
run();
console.log('c');
// 출력: a → c → b
```

## 실무에서 물리는 지점

- **마이크로태스크 기아(starvation)**: `.then` 안에서 계속 새 Promise를 만들며 재귀하면 마이크로태스크 큐가 안 비워져 **렌더링·이벤트가 멈춥니다.** 아래에서 직접 재 봤습니다.
- **렌더링 타이밍**: DOM을 바꾼 직후 크기를 읽어야 한다면 마이크로태스크(`await`)로는 부족할 수 있습니다. 다음 프레임이 필요하면 `requestAnimationFrame`.
- **Node.js 차이**: Node엔 `process.nextTick`이 있습니다. 보통은 Promise 마이크로태스크보다 **먼저** 처리되지만, 늘 그런 것은 아닙니다(아래 "nextTick 순서" 참고). 브라우저엔 없는 개념이라 크로스 런타임 코드에서 주의.

## 직접 재 보기 — 마이크로태스크로 쪼개도 화면은 멈춘다

"긴 작업을 잘게 쪼개면 화면이 안 멈춘다"는 말은 반만 맞습니다. **무엇으로 쪼개느냐**가 중요합니다. 1ms짜리 일을 500ms 동안 반복하는 작업을 세 방식으로 돌리고, 시작 150ms 뒤에 버튼을 눌러 봤습니다. 작업 중에 `requestAnimationFrame`이 몇 번 불렸는지(프레임 — 화면을 그릴 기회)와 클릭 핸들러가 작업 시작 몇 ms 뒤에 실행됐는지(클릭)를 셉니다.

```js
const busy = (ms) => { const end = performance.now() + ms; while (performance.now() < end); };

// 마이크로태스크로 이어 가기
const step = () => { busy(1); if (performance.now() < end) Promise.resolve().then(step); };
// 태스크로 이어 가기 — then 대신 setTimeout(step, 0)
```

Chrome 158(Playwright)에서 방식마다 세 번씩 돌린 결과입니다. "안 쪼갬"은 500ms 동기 루프, `then`은 `Promise.then`으로 이어 간 것입니다.

| 방식         | 프레임 | 클릭(ms) |
| ------------ | -----: | -------: |
| 안 쪼갬      |      0 |  534~535 |
| `then`       |      0 |  535~573 |
| `setTimeout` |  29~30 |  154~173 |

마이크로태스크로 쪼갠 작업은 **쪼개지 않은 동기 루프와 똑같이** 화면을 한 번도 그리지 못했고, 클릭도 작업이 다 끝난 뒤에야 처리됐습니다. 위의 리듬대로 "마이크로태스크를 전부 비운 뒤에야" 렌더링과 다음 태스크(클릭)로 넘어가기 때문입니다. `setTimeout`으로 이어 가면 조각 사이마다 태스크 경계가 생겨 브라우저가 그리고, 클릭도 작업 도중(시작 약 155ms 뒤)에 처리됩니다. 이 차이가 실제 사용자 반응성 지표에 어떻게 잡히는지는 [INP 글](/posts/inp-core-web-vitals/)에서 재 봤습니다.

## nextTick 순서 — 모듈이냐 아니냐

Node에서 같은 코드를 파일 확장자만 바꿔 돌리면 순서가 달라집니다(Node 22.23.4).

```js
Promise.resolve().then(() => console.log('promise'));
queueMicrotask(() => console.log('queueMicrotask'));
process.nextTick(() => console.log('nextTick'));
setTimeout(() => {
  Promise.resolve().then(() => console.log('[타이머 안] promise'));
  process.nextTick(() => console.log('[타이머 안] nextTick'));
}, 0);
```

- **`.cjs`(CommonJS)**: nextTick → promise → queueMicrotask → [타이머 안] nextTick → [타이머 안] promise
- **`.mjs`(ES 모듈)**: promise → queueMicrotask → nextTick → [타이머 안] nextTick → [타이머 안] promise

ES 모듈 최상위에서 예약하면 Promise 마이크로태스크가 먼저 비워지고 nextTick이 그 뒤입니다. ES 모듈은 비동기로 평가되어 최상위 코드가 이미 Promise 작업 안에서 돌기 때문으로 보입니다. 타이머 콜백 안에서는 두 방식 모두 nextTick이 먼저입니다. "nextTick이 항상 먼저"라고 기대하는 코드는 ES 모듈로 옮길 때 순서가 바뀔 수 있습니다.

> 규칙 하나만 기억하세요. **"동기 코드 전부 → 마이크로태스크 전부 → 태스크 하나 → 다시 마이크로태스크 전부…"** 이 리듬이 비동기 순서의 전부입니다.
