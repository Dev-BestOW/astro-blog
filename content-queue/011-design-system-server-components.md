---
title: 'Next.js 서버 컴포넌트용 디자인 시스템 — use client 위치'
description: '라이브러리 전체에 use client 를 붙이면 서버에서 함수도 못 부릅니다. 진입점을 둘로 나눈 법과 이름이 사라지는 함정.'
tags: ['react', 'nextjs', 'design-system']
series: 'BestOW UI 만들기'
draft: false
---

Next.js App Router 의 서버 컴포넌트에서는 hook·Context·이벤트 핸들러를 쓸 수 없습니다. 그래서 UI 라이브러리는 흔히 번들 맨 위에 `"use client"` 를 붙입니다. 그러면 라이브러리 전체가 클라이언트 컴포넌트가 되어 서버 컴포넌트에서 import 해도 일단 동작합니다.

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 도 처음에는 그렇게 했습니다. 1.0 출시 전에 패킹한 패키지를 새 Next.js 프로젝트에 설치해 점검하다가(2026-10-16) 문제가 드러났습니다.

## "use client" 는 함수도 클라이언트 참조로 만든다

서버 컴포넌트에서 테마를 만들려고 `createTheme()` 를 불렀더니 이런 오류가 났습니다.

```
Attempted to call createTheme() from the server
```

`"use client"` 파일에서 내보낸 것은 컴포넌트든 함수든 서버에서는 **클라이언트 참조**(나중에 브라우저에서 불러올 자리표시)가 됩니다. 서버에서 직접 실행할 수 없습니다. 테마 함수, CSS 변수 객체(`vars`), 전화번호 서식 함수처럼 서버에서 그대로 쓰고 싶은 값이 모두 막힌 것입니다.

## 진입점을 둘로 나눈다

ESM 빌드를 두 파일로 나눴습니다.

| 파일             | 지시어         | 담는 것                                                                      |
| ---------------- | -------------- | ---------------------------------------------------------------------------- |
| `dist/client.js` | `"use client"` | 상호작용이 있는 컴포넌트·hook                                                |
| `dist/shared.js` | 없음           | 순수 함수·값, hook 없는 표시용 컴포넌트(Typography·Stack·Grid·Card·Badge 등) |
| `dist/index.js`  | 없음           | `export * from './shared.js'` + `export * from './client.js'`                |

사용자는 여전히 `import { Button, createTheme } from '@bestow-ui/react'` 한 줄로 씁니다. 서버 컴포넌트에서 `createTheme` 를 부르면 shared 쪽 실제 함수가, `Button` 을 그리면 client 쪽 컴포넌트가 쓰입니다.

빌드(tsup)는 두 entry 를 받아 나누고, 둘이 함께 쓰는 모듈(`vars`, `cx` 등)은 esbuild 가 chunk 로 뽑습니다. 그 chunk 는 순수 모듈뿐이라 지시어가 필요 없습니다. 그리고 `"use client"` 가 빠지면 빌드를 실패시킵니다(줄인 코드).

```ts
const esm: Options = {
  entry: { client: 'src/client.ts', shared: 'src/shared.ts' },
  format: ['esm'],
  splitting: true,
  async onSuccess() {
    // "use client" 는 src/client.ts 맨 위의 지시어를 esbuild 가 그대로 남긴다 — 빠지면 빌드를 실패시킨다
    if (!(await readFile('dist/client.js', 'utf8')).startsWith('"use client";')) {
      throw new Error('dist/client.js 맨 앞에 "use client" 가 없습니다');
    }
    await writeFile('dist/index.js', "export * from './shared.js';\nexport * from './client.js';\n");
  },
};
```

## 함정: 같은 이름을 양쪽에서 내보내면 사라진다

`export *` 두 줄에서 **같은 이름이 양쪽에 있으면**, JavaScript 는 그 이름을 모호하다고 보고 내보내지 않습니다. 보통은 같은 함수라 문제가 없지만, Next.js 에서는 한쪽이 서버용 실제 함수이고 다른 쪽이 클라이언트 참조라 **서로 다른 값**이 됩니다. 결과적으로 그 이름이 조용히 사라집니다.

규칙을 정했습니다. **순수 함수·hook 없는 표시용 컴포넌트는 shared, 나머지는 client. 같은 이름을 양쪽에서 내보내지 않는다.** 사람이 지키기 어려운 규칙이라 테스트로 고정했습니다.

```ts
describe('shared 진입점 (서버 컴포넌트용)', () => {
  it('import 그래프에 클라이언트 전용 코드(hook·Context·Radix·이벤트 핸들러·"use client")가 없다', () => {
    // shared.ts 에서 시작해 import 를 따라가며 모든 파일을 검사한다(줄인 코드)
    expect(violations).toEqual([]);
  });

  it('같은 이름을 shared 와 client 양쪽에서 export 하지 않는다 (Next.js 에서 이름이 모호해져 사라진다)', () => {
    expect(Object.keys(shared).filter((name) => name in client)).toEqual([]);
  });
});
```

첫 번째 테스트 덕분에, shared 쪽 표시용 컴포넌트에 누군가 hook 을 하나 더하면 바로 실패합니다. 그러면 그 컴포넌트를 client 로 옮겨야 합니다. 다만 옮기면 서버 컴포넌트에서 그 컴포넌트에 함수를 넘기던 사용자 코드가 깨질 수 있어 신중하게 정합니다.

## 서버 컴포넌트에서 함수를 넘길 수 없는 문제

또 하나 걸리는 곳이 **다른 컴포넌트로 렌더링하는 prop** 입니다. `<Link as={NextLink}>` 처럼 컴포넌트(함수)를 prop 으로 넘기는 방식은 서버 컴포넌트에서 쓸 수 없습니다. 서버에서 클라이언트 컴포넌트로 함수를 넘길 수 없기 때문입니다. 그래서 이런 컴포넌트에는 `asChild` 를 함께 제공합니다.

```tsx
// 클라이언트 컴포넌트에서
<Link as={NextLink} href="/orders">주문</Link>

// 서버 컴포넌트에서 — 함수 대신 자식 요소를 넘긴다
<Link asChild>
  <NextLink href="/orders">주문</NextLink>
</Link>
```

## 실제 설치 환경에서 확인한다

라이브러리 저장소 안의 예제 앱(Next.js)은 소스가 아니라 **빌드된 `dist` 를 그대로** 씁니다. 실제로 npm 에서 설치한 것과 같은 조건입니다. 첫 페이지를 서버 컴포넌트로 두고, 거기서 테마·서식 함수를 서버에서 직접 부르게 했습니다. 진입점 구성이 깨지면 예제 앱 빌드가 실패해 CI 에서 바로 드러납니다.

## 정리

- 번들 전체에 `"use client"` 를 붙이면 **함수·값도 클라이언트 참조**가 되어 서버 컴포넌트에서 부를 수 없습니다.
- 진입점을 `shared`(지시어 없음)·`client`(`"use client"`)로 나누고, `index` 에서 둘을 다시 합칩니다.
- **같은 이름을 양쪽에서 내보내지 않습니다.** Next.js 에서 이름이 사라집니다. 이 규칙과 "shared 에 클라이언트 코드 없음" 을 테스트로 고정합니다.
- 컴포넌트를 prop 으로 받는 API 에는 서버 컴포넌트용 `asChild` 를 함께 둡니다.
- 확인은 소스가 아니라 **빌드 결과를 설치한 앱**에서 합니다.
