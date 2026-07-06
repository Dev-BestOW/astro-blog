---
title: 'TypeScript satisfies — 타입 검사와 추론을 동시에'
description: '`as`는 위험하고, `: Type`는 타입을 넓혀버립니다. satisfies는 "검사는 하되 좁은 추론은 유지"하는 세 번째 길입니다.'
tags: ['typescript']
---

TypeScript 4.9에서 들어온 `satisfies`는 6년차라면 반드시 손에 익혀야 할 연산자입니다. **"이 값이 특정 타입을 만족하는지 검사"하면서도, 변수의 실제(좁은) 타입은 그대로 추론**되게 해줍니다.

## 문제: 검사 vs 추론은 지금까지 양자택일이었다

```ts
type Config = Record<string, string | number>;

// 방법 A) 타입 애노테이션 → 검사는 되지만 타입이 넓어짐
const a: Config = { port: 8080, host: 'localhost' };
a.port; // string | number (숫자인 걸 잃음)
a.timeuot; // ❌ 오타지만... 넓은 인덱스 시그니처라 접근은 통과되기도

// 방법 B) as → 추론은 유지되지만 검사를 건너뜀(위험)
const b = { port: 8080, host: 'localhost' } as Config;
```

애노테이션은 안전하지만 `a.port`가 `string | number`로 넓어지고, `as`는 좁지만 **틀린 값도 통과**시킵니다.

## satisfies: 둘 다 얻기

```ts
const config = {
  port: 8080,
  host: 'localhost',
} satisfies Config;

config.port; // number (좁은 추론 유지!)
config.host; // string
// 잘못된 값이면 여기서 컴파일 에러
// { port: '8080' } satisfies Config → 통과(문자열도 허용 타입)
// { port: true }  satisfies Config → ❌ boolean은 Config 위반
```

`satisfies`는 값이 타입을 **만족하는지만 검사**하고, 변수 타입은 리터럴 그대로(`port: number`) 남깁니다.

## 실전에서 빛나는 곳

**유니온 키의 정확한 추론**

```ts
type Route = { path: string; method: 'GET' | 'POST' };

const routes = {
  home: { path: '/', method: 'GET' },
  submit: { path: '/submit', method: 'POST' },
} satisfies Record<string, Route>;

// keyof 추론이 살아 있음 → 'home' | 'submit'
type RouteName = keyof typeof routes;
routes.home.method; // 'GET' (리터럴, 넓은 string이 아님)
```

애노테이션(`: Record<string, Route>`)을 썼다면 `keyof`가 `string`으로 뭉개졌을 겁니다.

**팔레트·상수 맵**

```ts
const palette = {
  primary: '#4f46e5',
  danger: '#dc2626',
} satisfies Record<string, `#${string}`>;
// 각 값이 '#...' 형식인지 검사하면서, 키는 정확히 유지
```

> 규칙: **값의 형태는 검사하되 구체 타입은 잃고 싶지 않을 때 `satisfies`.** `as`로 우겨넣던 자리 상당수를 안전하게 대체할 수 있습니다.
