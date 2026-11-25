---
pubDate: 2026-07-09
updatedDate: 2026-11-25
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

게다가 **순환 참조**가 있으면 아예 예외(`TypeError: Converting circular structure to JSON`)를 던집니다. 위 주석의 결과와 아래 `structuredClone`의 되는 것·안 되는 것은 Node 22.23.4에서 직접 돌려 확인했습니다.

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

## 속도는 JSON 왕복이 더 빨랐다

"표준 함수니까 더 빠르겠지"라고 생각하기 쉬워서 직접 재 봤습니다. JSON으로도 복사할 수 있는 데이터(API 응답처럼 문자열·숫자·불리언·중첩 객체·배열로 된 사용자 목록)를 만들어 두 방법으로 복사하고, 여러 번 돌린 시간의 중앙값을 비교했습니다. 환경은 Apple M1, Node 22.23.4, Chrome 158입니다.

```js
// 항목 하나의 모양 (측정 코드에서 줄임)
{ id, name: `사용자 ${i}`, email, active, tags: ['a', 'b', 'c'],
  address: { city: '서울', zip, lines: ['도로명', `${i}번길`] } }
```

**Node 22.23.4**

| 항목 수 |    JSON | structuredClone |
| ------: | ------: | --------------: |
|   1,000 |  1.0 ms |          1.2 ms |
|  10,000 | 10.4 ms |         12.4 ms |
| 100,000 |  121 ms |          154 ms |

**Chrome 158**

| 항목 수 |    JSON | structuredClone |
| ------: | ------: | --------------: |
|   1,000 |  0.6 ms |          0.9 ms |
|  10,000 |  5.8 ms |          9.3 ms |
| 100,000 | 67.5 ms |          106 ms |

두 번 돌려도 같은 경향이었습니다. **`structuredClone`이 Node에서 약 1.2~~1.3배, Chrome에서 약 1.5~~1.8배 느렸습니다.** Chrome은 시간 값이 0.1ms 단위로 나와 100개 이하의 작은 데이터는 비교하지 않았습니다.

그러니 `structuredClone`을 고르는 이유는 속도가 아니라 **정확성**입니다. `Date`·`Map`·`Set`·`undefined`·순환 참조를 망가뜨리지 않는 것이 핵심이고, 순수 JSON 데이터를 아주 많이 자주 복사하는 곳이라면 JSON 왕복도 여전히 쓸 만한 선택입니다.

## 언제 무엇을 쓰나

| 상황                                     | 선택                                               |
| ---------------------------------------- | -------------------------------------------------- |
| 순수 데이터(Date/Map/Set 포함) 깊은 복사 | **`structuredClone`**                              |
| 서버에서 받은 JSON 그대로, 많고 자주     | JSON 왕복도 가능(위 측정에서 더 빠름)              |
| 클래스 인스턴스/메서드 유지 필요         | 직접 복사 로직 또는 라이브러리(lodash `cloneDeep`) |
| 얕은 복사면 충분                         | `{ ...obj }` / `structuredClone` 불필요            |

지원 범위도 넓습니다 — 모든 최신 브라우저와 Node 17+에서 전역으로 사용할 수 있습니다.

배열 하나만 바꾼 복사본이 필요하다면 깊은 복사까지 갈 필요도 없습니다. [toSorted·toReversed](/posts/immutable-array-methods/) 같은 메서드가 새 배열을 돌려줍니다.

> 규칙: **"데이터만 있으면 `structuredClone`, 동작(메서드)이 섞여 있으면 손으로."** JSON 왕복은 JSON으로 온 데이터를 그대로 복사할 때만 쓰고, 그 밖에는 조용히 망가지는 값이 없는 `structuredClone`이 기본입니다.
