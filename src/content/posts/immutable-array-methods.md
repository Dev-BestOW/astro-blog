---
pubDate: 2026-07-10
updatedDate: 2026-11-25
title: 'toSorted·toReversed — 원본을 안 바꾸는 배열 메서드'
description: '원본을 바꾸지 않는 ES2023 배열 메서드 toSorted·toReversed·toSpliced·with를 React 상태 예로 정리합니다.'
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

### 직접 재현해 보기

"리렌더가 안 될 수도"가 실제로 어떤 모습인지 React 19.3.1로 재현했습니다. `['다람쥐', '가방', '나무']`를 상태로 들고 버튼을 누르면 가나다순으로 정렬하는 컴포넌트입니다. 정렬 버튼을 누른 뒤, 목록과 상관없는 다른 상태(숫자 하나)를 바꾸는 버튼을 눌렀습니다(Chrome 158). 방법은 차례로 `prev.sort()`, `prev.toSorted()`, `[...prev].sort()`입니다. "누른 직후"는 정렬 버튼을 누른 직후 화면, "나중에"는 다른 상태를 바꿔 다시 그려진 뒤의 화면이고, "정렬됨"은 가방, 나무, 다람쥐 순서입니다. 컴포넌트가 그려진 횟수도 셌는데, `prev.sort()`는 정렬 버튼을 눌러도 처음 1번에서 늘지 않았고 나머지 둘은 2번이 됐습니다.

| 방법            | 누른 직후 | 나중에 |
| --------------- | --------- | ------ |
| `sort()`        | 그대로    | 정렬됨 |
| `toSorted()`    | 정렬됨    | 정렬됨 |
| 복사 + `sort()` | 정렬됨    | 정렬됨 |

`prev.sort()`는 상태 배열 안의 순서는 바꿨지만 같은 배열을 돌려줬으므로, React는 바뀐 게 없다고 보고 다시 그리지 않았습니다. 그러다 **상관없는 상태가 바뀌어 다시 그려지는 순간 목록이 갑자기 정렬된 채로 나타났습니다.** 원인과 결과가 떨어져 있어 찾기 어려운 버그입니다.

하나 더 있었습니다. 처음 상태로 넘긴 배열이 모듈 상수(`const initial = [...]`)였는데, `prev.sort()`가 그 상수까지 정렬해 버렸습니다. 측정을 되풀이하다가 다음 실험의 첫 화면이 이미 정렬돼 있는 것을 보고 알아챘습니다.

## findLast / findLastIndex

배열을 **뒤에서부터** 찾는 메서드도 함께 표준화됐습니다. `filter().at(-1)` 같은 우회가 필요 없습니다.

```js
const logs = [{ ok: true }, { ok: false }, { ok: true }];
logs.findLast((l) => l.ok); // { ok: true } (마지막 성공)
logs.findLastIndex((l) => !l.ok); // 1
```

## 지원 범위와 한 걸음 더

- 위 메서드들은 **ES2023**으로, 최신 브라우저와 Node 20+에서 널리 사용 가능합니다(Baseline). 아주 오래된 환경을 지원해야 하면 폴리필/트랜스파일 확인.
- **`Object.groupBy` / `Map.groupBy`**(ES2024)는 배열을 키로 그룹핑해 주는 더 최신 메서드입니다. 2024년 3월 Safari 17.4가 합류하며 모든 최신 브라우저에서 쓸 수 있게 됐고(Baseline 2024), Node는 21부터 지원합니다.

배열이 아니라 중첩된 객체 전체의 복사본이 필요하다면 [structuredClone](/posts/structured-clone/) 글을 참고하세요.

> "복사본을 반환하느냐, 원본을 바꾸느냐"를 메서드 이름(`to-` 접두어)만 보고 구분할 수 있게 됐습니다. 상태 관리 코드에선 기본적으로 불변 쪽을 쓰세요.
