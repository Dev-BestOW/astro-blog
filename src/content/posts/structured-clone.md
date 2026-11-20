---
pubDate: 2026-07-09
updatedDate: 2026-11-18
title: 'structuredClone으로 자바스크립트 깊은 복사하기'
description: 'JSON.stringify 깊은 복사의 함정과 structuredClone이 복사하는 것·못 하는 것, 얕은 복사와 나눠 쓰는 기준을 봅니다.'
tags: ['javascript', 'web-api']
---

깊은 복사를 위해 `JSON.parse(JSON.stringify(obj))`를 써 왔다면, 이제 표준 전역 함수 **`structuredClone`**이 있습니다. 다만 만능은 아니라, 되는 것과 안 되는 것을 정확히 알아야 합니다.

## JSON 왕복의 문제

`JSON.parse(JSON.stringify(x))`는 흔하지만 조용히 데이터를 망가뜨립니다.

```js
const obj = {
  date: new Date(),
  count: undefined,
  score: NaN,
  set: new Set([1, 2]),
};
JSON.parse(JSON.stringify(obj));
// { date: "2026-...Z"(문자열!), score: null, set: {} }
// → Date는 문자열로, undefined 키는 사라지고, NaN은 null, Set은 {}로 소실
```

게다가 **순환 참조**가 있으면 아예 예외를 던집니다.

## structuredClone이 하는 일

```js
const deep = structuredClone(obj);
```

- ✅ 중첩 객체·배열을 재귀 복사
- ✅ `Date`, `Map`, `Set`, `RegExp`, `ArrayBuffer`, `TypedArray`, `Blob`, `File` 등 보존
- ✅ **순환 참조** 처리 (JSON은 못 함)

## structuredClone이 못 하는 일

구조화 복제 알고리즘은 "데이터"만 복제합니다. 다음은 **`DataCloneError` 예외**를 던지거나 소실됩니다.

- ❌ **함수**, 메서드 → 복제 불가(예외)
- ❌ **DOM 노드** → 예외
- ❌ **프로토타입/클래스**: 클래스 인스턴스를 복제하면 데이터는 복사되지만 **프로토타입이 사라져 평범한 객체**가 됩니다(`instanceof` 깨짐).
- ❌ **getter/setter, 프로퍼티 디스크립터** → 일반 값으로 평탄화

```js
class User {
  constructor(n) {
    this.name = n;
  }
  greet() {
    return 'hi';
  }
}
const u = structuredClone(new User('kim'));
u instanceof User; // false — 프로토타입 소실
u.greet; // undefined
```

## 언제 무엇을 쓰나

| 상황                                     | 선택                                               |
| ---------------------------------------- | -------------------------------------------------- |
| 순수 데이터(Date/Map/Set 포함) 깊은 복사 | **`structuredClone`**                              |
| 클래스 인스턴스/메서드 유지 필요         | 직접 복사 로직 또는 라이브러리(lodash `cloneDeep`) |
| 얕은 복사면 충분                         | `{ ...obj }` / `structuredClone` 불필요            |

지원 범위도 넓습니다 — 모든 최신 브라우저와 Node 17+에서 전역으로 사용할 수 있습니다.

> 규칙: **"데이터만 있으면 `structuredClone`, 동작(메서드)이 섞여 있으면 손으로."** JSON 왕복은 이제 특별한 이유가 없으면 쓰지 마세요.
