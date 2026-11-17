---
title: 'Button 하나 썼는데 40 kB — /* @__PURE__ */ 와 트리 셰이킹'
description: 'UI 라이브러리에서 Button 하나만 import 했는데 번들에 거의 모든 컴포넌트가 들어 있었습니다. forwardRef, vanilla-extract recipe, 객체 속성 읽기처럼 "부작용이 있을지 모르는" 최상위 코드가 트리 셰이킹을 막은 세 가지 사례와, size-limit 로 다시 깨지지 않게 감시하는 방법을 정리합니다.'
tags: ['javascript', 'performance', 'design-system']
series: 'BestOW UI 만들기'
draft: false
---

라이브러리를 `import { Button } from '…'` 로 쓰면, 번들러가 쓰지 않는 나머지 코드를 지워 줄 것이라고 기대합니다. 트리 셰이킹입니다. 그런데 React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 에 번들 크기 검사(size-limit)를 붙인 첫날, **Button 하나만 쓴 번들이 40 kB** 였습니다. 거의 전체 라이브러리였습니다.

이 글은 그 뒤 세 번에 걸쳐 찾은 원인입니다. 셋 다 같은 이유였습니다. **번들러는 최상위에서 실행되는 코드에 부작용이 없다고 확신할 수 없으면 지우지 않습니다.**

## 번들러가 지우지 못하는 코드

```js
export const Button = forwardRef(function Button(props, ref) { … });
```

이 줄은 모듈을 불러오는 순간 `forwardRef(…)` 를 **호출**합니다. 번들러 입장에서 이 함수가 전역 상태를 바꾸는지(부작용) 알 수 없습니다. 그래서 `Button` 을 아무도 쓰지 않아도 호출을 남겨 둡니다. 그 호출이 참조하는 코드도 함께 남습니다. 컴포넌트마다 이런 줄이 있으니, 하나만 써도 전부 딸려 옵니다.

`/* @__PURE__ */` 주석은 "이 호출은 결과를 쓰지 않으면 지워도 된다" 고 번들러(esbuild·Rollup·webpack 의 Terser 등)에 알려 줍니다.

```js
export const Button = /* @__PURE__ */ forwardRef(function Button(props, ref) { … });
```

## 사례 1: forwardRef·createContext — 40 kB → 2.4 kB

최상위의 모든 `forwardRef(…)` 와 `createContext(…)` 에 표시를 붙였습니다. Button 하나 번들이 **40 kB → 2.4 kB** 가 됐습니다. 지금은 프로젝트 규칙으로 적어 두었습니다. "최상위 `forwardRef(...)`/`createContext(...)` 에는 `/* @__PURE__ */` 를 붙인다."

## 사례 2: vanilla-extract recipe — 2.6 kB → 1.48 kB

얼마 뒤 Button 크기가 조금씩 늘었습니다. 추적해 보니 스타일이었습니다. 컴포넌트 변형(크기·색)은 vanilla-extract 의 `recipe()` 로 만드는데, 빌드하면 각 `.css.ts` 파일이 이런 코드가 됩니다.

```js
export var button = _7a468({ … }); // recipe() 호출, 표시 없음
```

역시 최상위 호출이라 지워지지 않았고, Button 하나에 **모든 컴포넌트의 recipe** 가 남았습니다. 이건 생성되는 코드라 소스에 주석을 달 수 없습니다. 그래서 빌드(tsup) 단계에서 vanilla-extract 플러그인을 감싸, 결과 코드의 최상위 호출에 표시를 붙였습니다(실제 코드).

```ts
function withPureRecipes(plugin: EsbuildPlugin): EsbuildPlugin {
  return {
    name: `${plugin.name}:pure-recipes`,
    setup(build) {
      return plugin.setup({
        ...build,
        onLoad(options, callback) {
          build.onLoad(options, async (args) => {
            const result = await callback(args);
            if (result && typeof result.contents === 'string') {
              result.contents = result.contents.replace(/^(export var [\w$]+ = )(_[\w$]+\()/gm, '$1/* @__PURE__ */ $2');
            }
            return result;
          });
        },
      });
    },
  };
}
```

Button 하나가 **2.6 kB → 1.48 kB** 가 됐습니다. 이 표시를 빼면 감시 한도(2 kB)를 598 B 넘어 실패하는 것도 확인했습니다.

## 사례 3: 객체 속성 하나 읽었을 뿐인데 +460 B

세 번째는 함수 호출도 아니었습니다. 입력 칸 테두리를 진하게 하는 테마 프리셋을 처음에는 tokens 패키지의 색을 읽어 만들었습니다(그때 코드, 줄임).

```ts
import { palette } from '@bestow-ui/tokens';

export const strongInputBorders = {
  light: { color: { border: { input: palette.gray[600] /* … */ } } },
};
```

이것만으로 "앱 기본" 조합(ThemeProvider·Button·Typography·Stack)이 **3.37 → 3.83 kB** 로 늘어 한도를 넘었습니다. 이 프리셋을 쓰지 않는 앱에도요. 최상위에서 **import 한 객체의 속성을 읽는 것**도 번들러에게는 부작용일 수 있는 동작입니다(getter 가 있을 수 있으니까요). 그래서 `/* @__PURE__ */` 를 붙여도 지우지 못했고, tokens 의 색 정의 전체가 딸려 왔습니다.

해결은 값을 **직접 적는 것**이었습니다(지금 코드, 일부).

```ts
// 색은 palette 를 import 하지 않고 값으로 적는다 — `palette.gray[600]` 같은 속성 읽기는 번들러가 지우지 못해,
// 이 값을 쓰지 않는 앱에도 tokens 전체가 딸려 왔다("앱 기본" +460 B).
export const strongInputBorders: ThemeInput = /* @__PURE__ */ Object.freeze({
  light: { color: { border: { input: '#666e76', inputHover: '#495057', control: '#666e76' } } },
  dark: { color: { border: { input: '#adb5bd', inputHover: '#dee2e6', control: '#adb5bd' } } },
});
```

값을 손으로 적으면 원본 색이 바뀔 때 어긋날 수 있으니, 테스트가 tokens 의 기본값과 같은지 확인합니다.

```ts
it.each(modes)('%s: 2.0 기본값과 같다 — 남아 있는 사용자 코드의 화면이 바뀌지 않는다', (mode, colors) => {
  const { input, inputHover, control } = colors.border;
  expect(strongInputBorders[mode]!.color!.border).toEqual({ input, inputHover, control });
});
```

## 같은 원리로 의존성도 고른다

Button 에 `asChild`(다른 요소로 렌더링) 기능을 더할 때, 흔히 쓰는 Radix Slot 을 쓰면 Button 하나가 **1.18 kB** 늘었습니다. "Button 하나 2 kB" 한도를 지키려고 `cloneElement` 로 직접 구현했습니다. 크기 한도가 있으면 이런 결정을 숫자로 할 수 있습니다.

## 다시 깨지지 않게: size-limit

트리 셰이킹은 한 번 고쳐도 누군가 최상위 코드를 한 줄 더하면 다시 깨집니다. 그래서 CI 에서 **조합별 크기 한도**를 검사합니다(`.size-limit.json` 일부).

```json
[
  { "name": "react: 전체 (JS) — 모든 컴포넌트, 큰 회귀만 감시", "import": "*", "limit": "80 kB" },
  { "name": "react: Button 하나 (JS) — tree-shaking 회귀 감시", "import": "{ Button }", "limit": "2 kB" },
  { "name": "react: 앱 기본 (ThemeProvider·Button·Typography·Stack)", "import": "{ ThemeProvider, Button, Typography, Stack }", "limit": "4.4 kB" }
]
```

핵심은 **"Button 하나"** 항목입니다. 전체 크기는 기능이 늘면 자연히 커지지만, Button 하나의 크기가 갑자기 늘었다면 거의 항상 트리 셰이킹이 깨진 것입니다. 지금 Button 하나는 약 1.7 kB 입니다. PR 마다 크기 변화를 코멘트로 보여 주는 워크플로도 따로 둡니다.

## 정리

- 번들러는 **부작용이 없다고 확신할 수 없는 최상위 코드**를 지우지 않습니다. 최상위 함수 호출(`forwardRef`, `createContext`, `recipe`)이 대표적입니다.
- 직접 쓴 코드에는 `/* @__PURE__ */` 를, 생성되는 코드에는 빌드 플러그인으로 표시를 붙입니다.
- **import 한 객체의 속성을 최상위에서 읽는 것**도 막힐 수 있습니다. 값으로 적고 테스트로 원본과 묶습니다.
- "컴포넌트 하나" 크기 한도를 CI 에 두면 다음 회귀를 바로 잡습니다.
