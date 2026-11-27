---
pubDate: 2026-11-27
title: 'React 18·19 동시 지원 라이브러리 — CI 로 호환성 테스트하기'
description: 'peerDependencies 만 넓히면 18 에서 깨져도 모릅니다. SSR 경고·useRef 타입·ref 변화와 pnpm overrides.'
tags: ['react', 'testing', 'typescript']
series: 'BestOW UI 만들기'
draft: false
---

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 는 `peerDependencies` 에 `"react": "^18.0.0 || ^19.0.0"` 을 적었습니다. 아직 React 18 을 쓰는 프로젝트가 많기 때문입니다. 그런데 저장소의 개발·테스트는 React 19 로만 돌고 있었습니다. 18 에서 무엇이 깨지는지 알 방법이 없었던 셈입니다.

## 출시 전 점검에서 나온 것

1.0 출시 전에 패킹한 패키지를 새 프로젝트에 설치해 React 18·19, TypeScript 여러 버전으로 확인했습니다(2026-10-16). React 18 에서 하나가 걸렸습니다.

**서버 렌더링에서 `useLayoutEffect` 경고.** 서식 입력(전화번호 등)은 커서 위치를 그리기 전에 맞추려고 `useLayoutEffect` 를 씁니다. React 18 은 서버에서 이 hook 을 만나면 "useLayoutEffect does nothing on the server" 경고를 남깁니다(React 19 는 남기지 않습니다). 서버에서는 `useEffect` 를 쓰는 작은 도우미로 바꿨습니다(실제 코드).

```ts
/**
 * 브라우저에서는 useLayoutEffect, 서버 렌더링에서는 useEffect.
 * React 18 은 서버에서 useLayoutEffect 를 부르면 "useLayoutEffect does nothing on the server" 경고를 남긴다.
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
```

한 번 고치는 것으로는 부족합니다. 다음 컴포넌트에서 또 `useLayoutEffect` 를 쓰면 다시 생깁니다. 그래서 두 가지를 CI 에 넣었습니다.

## 1. 모든 컴포넌트를 서버에서 렌더링하는 테스트

Node 환경에서 **모든 컴포넌트를 `renderToString`** 하고, 경고·오류가 하나도 없는지 확인하는 테스트를 두었습니다.

```ts
// @vitest-environment node
import { renderToString } from 'react-dom/server';
// … 모든 컴포넌트를 렌더링하고, console.error·warn 이 한 번도 불리지 않았는지 확인한다(줄인 코드)
```

React 19 에서는 이 경고가 없으니, 이 테스트가 의미가 있으려면 **React 18 로도 돌아야** 합니다. 컴포넌트에 일부러 `useLayoutEffect` 를 넣어 React 18 에서 실패하는 것을 확인했습니다. 새 컴포넌트를 만들면 이 테스트에도 넣는 것을 규칙으로 했습니다.

## 2. React 18 CI job — 두 벌이 섞이지 않게

CI 에 React 18 전용 job 을 만들었습니다. 처음에는 react 패키지의 React 만 18 로 바꾸면 될 줄 알았는데, 그러면 Radix·아이콘 패키지가 여전히 19 를 물어 **React 가 두 벌** 섞입니다. 테스트는 "Objects are not valid as a React child" 같은 엉뚱한 오류로 실패합니다.

그래서 pnpm 의 `overrides` 로 **워크스페이스 전체**를 18 로 맞춥니다(실제 job, 일부).

```yaml
- name: Use React 18 (pnpm overrides)
  run: |
    # pnpm-workspace.yaml 맨 끝의 overrides 블록에 줄을 더한다(키를 다시 만들면 중복 키 오류)
    printf '  react: 18.3.1\n  react-dom: 18.3.1\n  "@types/react": 18.3.12\n  "@types/react-dom": 18.3.1\n' >> pnpm-workspace.yaml
    pnpm install --no-frozen-lockfile
    version=$(cd packages/react && node -p "require('react/package.json').version")
    case "$version" in 18.*) ;; *) echo "::error::React 18 이 아닙니다 ($version)"; exit 1 ;; esac

- name: Typecheck (@types/react 18)
  run: pnpm --filter @bestow-ui/react typecheck

- name: Test (React 18)
  run: pnpm --filter @bestow-ui/react test
```

- 마지막에 **실제로 18 이 설치됐는지** 확인합니다. 설정이 조용히 무시되면 19 로 테스트하고도 통과했다고 믿게 됩니다.
- `pnpm-workspace.yaml` 에는 보안 경고 대응용 `overrides:` 블록이 이미 있습니다. 이 job 은 그 블록 **끝에 줄을 덧붙입니다.** 그래서 그 블록은 파일 맨 끝에 있어야 합니다(뒤에 다른 키를 두면 이 job 이 깨집니다).

## 이 job 이 잡은 것: useRef 타입

얼마 뒤 이 job 이 타입 검사에서 실패했습니다. 파일 업로드 컴포넌트에 이렇게 쓴 코드였습니다.

```ts
const timer = useRef<ReturnType<typeof setTimeout>>(undefined); // React 19 타입에서만 통과
```

`useRef<T>(undefined)` 오버로드는 React 19 의 타입에만 있습니다. `@types/react` 18 에는 없어 타입 오류가 납니다. 두 버전에서 모두 통하게 바꿨습니다.

```ts
const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
```

19 로만 개발했다면 React 18 + TypeScript 사용자가 설치한 뒤에야 발견했을 오류입니다.

## 19 에서 바뀐 ref

버튼을 다른 요소로 렌더링하는 `asChild` 를 `cloneElement` 로 만들 때도 버전 차이가 있었습니다. 자식 요소의 ref 가 **React 19 에서는 `props.ref`**, **18 에서는 `element.ref`** 에 있습니다. 19 에서 `element.ref` 를 읽으면 경고가 납니다(실제 코드, 일부).

```ts
// React 19 는 ref 가 props 에 있고, element.ref 를 읽으면 경고한다. 18 은 element.ref 에만 있다
ref: mergeRefs(ref, parseInt(version) >= 19 ? props.ref : child.ref),
```

## 정리

- `peerDependencies` 에 적은 버전은 **CI 에서 모두 돌려야** 지원한다고 말할 수 있습니다.
- React 18 로 테스트할 때는 `overrides` 로 **워크스페이스 전체**를 맞추고, 실제 설치된 버전을 확인합니다.
- 서버 렌더링 경고는 모든 컴포넌트를 `renderToString` 하는 테스트로 잡습니다. React 18 에서만 나는 경고가 있습니다.
- 타입(`@types/react` 18)과 ref 위치(18 `element.ref` / 19 `props.ref`)처럼 **런타임 밖의 차이**도 있습니다.
