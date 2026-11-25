---
pubDate: 2026-07-11
updatedDate: 2026-11-25
title: 'TypeScript satisfies — 타입 검사와 추론을 동시에'
description: '`as`는 위험하고, `: Type`는 타입을 넓혀버립니다. satisfies는 "검사는 하되 좁은 추론은 유지"하는 세 번째 길입니다.'
tags: ['typescript']
---

TypeScript 4.9에서 들어온 `satisfies`는 설정 객체나 디자인 토큰처럼 "형태는 검사하되 값은 그대로 두고 싶은" 상수에 쓰는 연산자입니다. **"이 값이 특정 타입을 만족하는지 검사"하면서도, 변수의 실제(좁은) 타입은 그대로 추론**되게 해줍니다.

## 문제: 검사 vs 추론은 지금까지 양자택일이었다

```ts
type Config = Record<string, string | number>;

// 방법 A) 타입 애노테이션 → 검사는 되지만 타입이 넓어짐
const a: Config = { port: 8080, host: 'localhost' };
a.port; // string | number (숫자인 걸 잃음)
a.timeuot; // 오타인데 오류가 나지 않음 — 인덱스 시그니처라 어떤 키든 통과

// 방법 B) as → 타입이 Config로 바뀌어 똑같이 넓어지고, 검사도 느슨함
const b = { port: 8080, host: 'localhost' } as Config;
b.port; // string | number — as도 좁은 타입을 지키지 못함
```

애노테이션은 안전하지만 `a.port`가 `string | number`로 넓어집니다. `as`도 결과 타입이 `Config`라 똑같이 넓어지고, 검사는 "두 타입이 겹치는지"만 봅니다. `{ port: true } as Config`처럼 아예 안 겹치면 오류가 나지만, 필요한 속성이 빠진 값처럼 **애노테이션이라면 막았을 값을 통과**시키는 경우가 많습니다.

## satisfies: 둘 다 얻기

```ts
const config = {
  port: 8080,
  host: 'localhost',
} satisfies Config;

config.port; // number (좁은 추론 유지!)
config.host; // string
config.timeuot; // ❌ 오타를 잡음 — 객체에 없는 속성
// 잘못된 값이면 여기서 컴파일 에러
// { port: '8080' } satisfies Config → 통과(문자열도 허용 타입)
// { port: true }  satisfies Config → ❌ boolean은 Config 위반
```

`satisfies`는 값이 타입을 **만족하는지만 검사**하고, 변수 타입은 리터럴 그대로(`port: number`) 남깁니다. 오타 주석 두 줄(`a.timeuot`, `config.timeuot`)은 TypeScript 5.9.3(`--strict`)으로 확인한 결과입니다. 애노테이션 쪽은 오류가 없고, `satisfies` 쪽만 `Property 'timeuot' does not exist` 오류가 납니다.

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

## 실제로 쓴 곳 — 다크 모드 토큰의 키 맞추기

제가 만드는 디자인 시스템 [BestOW UI](https://bestow-ui.com/)의 디자인 토큰에는 라이트 모드 그림자 `shadow`와 다크 모드 그림자 `darkShadow`가 있습니다. 테마를 바꾸면 같은 키(`sm`·`md`·`lg`)의 값을 갈아 끼우므로 두 객체의 키가 어긋나면 안 됩니다.

```ts
// packages/tokens/src/index.ts (줄인 코드)
export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 12px 32px rgba(0, 0, 0, 0.12)',
} as const;

export const darkShadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
  md: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.5)',
  lg: '0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 32px rgba(0, 0, 0, 0.6)',
} as const satisfies Record<keyof typeof shadow, string>;
```

`as const`로 값은 리터럴 그대로 두고, `satisfies`로 "키가 `shadow`와 같은가"만 검사합니다. TypeScript 5.9.3으로 키를 일부러 틀려 보면 세 경우 모두 컴파일 오류가 납니다.

| 바꾼 것           | 오류                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `lg`를 빠뜨림     | TS1360 `does not satisfy the expected type` — `Property 'lg' is missing`    |
| `xl`을 더함       | TS2353 `'xl' does not exist in type 'Record<"sm" \| "md" \| "lg", string>'` |
| `lg`를 `lgg`로 씀 | TS2353 `'lgg' does not exist in type …`                                     |

키 검사만이라면 애노테이션(`const darkShadow: Record<keyof typeof shadow, string> = …`)으로도 됩니다. 같은 방식으로 확인하면 빠진 키(TS2741)와 더한 키(TS2353)가 모두 잡힙니다. 차이는 값의 타입입니다. 애노테이션을 쓰면 `darkShadow.lg`가 `string`으로 넓어지고, `satisfies`를 쓰면 적어 둔 문자열이 리터럴 타입으로 남습니다.

> 규칙: **값의 형태는 검사하되 구체 타입은 잃고 싶지 않을 때 `satisfies`.** `as`로 우겨넣던 자리 상당수를 안전하게 대체할 수 있습니다.
