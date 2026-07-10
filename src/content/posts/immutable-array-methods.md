---
pubDate: 2026-07-10
title: '불변 배열 메서드 — toSorted, toReversed, with (ES2023)'
description: 'sort()가 원본을 바꿔서 React 상태가 꼬인 경험이 있다면. ES2023의 불변 배열 메서드가 그 문제를 문법 차원에서 없앱니다.'
tags: ['javascript', 'typescript']
---

`array.sort()`가 **원본을 제자리에서(in-place) 바꾼다**는 사실에 한 번쯤 데여봤을 겁니다. React 상태 배열을 `sort()`하면 참조는 그대로라 리렌더가 안 되거나, 원본이 변형돼 버그가 납니다. ES2023이 이걸 언어 차원에서 해결했습니다.

## 원본을 바꾸는 옛 메서드 vs 새 불변 메서드

| 변형(mutating) | 불변(복사본 반환) |
| -------------- | ----------------- |
| `sort()`       | `toSorted()`      |
| `reverse()`    | `toReversed()`    |
| `splice()`     | `toSpliced()`     |
| `arr[i] = v`   | `with(i, v)`      |

이들은 원본을 건드리지 않고 **새 배열을 반환**합니다.

```js
const nums = [3, 1, 2];

const sorted = nums.toSorted((a, b) => a - b); // [1, 2, 3]
nums; // [3, 1, 2] — 원본 그대로!

const updated = nums.with(0, 99); // [99, 1, 2], 원본 불변
const removed = nums.toSpliced(1, 1); // [3, 2]
```

## React에서 왜 중요한가

```js
// 나쁨: 상태 원본을 변형 → 예측 불가한 버그
setItems((prev) => {
  prev.sort(byDate); // prev를 직접 변형!
  return prev; // 같은 참조 → 리렌더 안 될 수도
});

// 좋음: 불변 메서드로 새 배열
setItems((prev) => prev.toSorted(byDate));
```

기존엔 `[...prev].sort()`처럼 **스프레드로 먼저 복사**해야 했는데, `toSorted` 하나로 의도가 명확해집니다.

## findLast / findLastIndex

배열을 **뒤에서부터** 찾는 메서드도 함께 표준화됐습니다. `filter().at(-1)` 같은 우회가 필요 없습니다.

```js
const logs = [{ ok: true }, { ok: false }, { ok: true }];
logs.findLast((l) => l.ok); // { ok: true } (마지막 성공)
logs.findLastIndex((l) => !l.ok); // 1
```

## 지원 범위와 한 걸음 더

- 위 메서드들은 **ES2023**으로, 최신 브라우저와 Node 20+에서 널리 사용 가능합니다(Baseline). 아주 오래된 환경을 지원해야 하면 폴리필/트랜스파일 확인.
- **`Object.groupBy` / `Map.groupBy`**(ES2024)는 배열을 키로 그룹핑해 주는 더 최신 메서드입니다. 지원이 아직 얇을 수 있으니 타겟 환경을 확인하고 쓰세요.

> "복사본을 반환하느냐, 원본을 바꾸느냐"를 메서드 이름(`to-` 접두어)만 보고 구분할 수 있게 됐습니다. 상태 관리 코드에선 기본적으로 불변 쪽을 쓰세요.
