---
title: '다크 모드 깜빡임 없애기 — SSR 에서 OS 설정 따르기'
description: 'OS 설정을 모르는 서버 렌더링의 깜빡임을 prefers-color-scheme 미디어쿼리와 useSyncExternalStore 로 막은 법.'
tags: ['react', 'css', 'nextjs']
series: 'BestOW UI 만들기'
draft: false
---

"OS 설정을 따르는 다크 모드" 는 간단해 보입니다. `matchMedia('(prefers-color-scheme: dark)')` 를 보고 테마를 고르면 되니까요. 그런데 서버 렌더링이 끼면 문제가 생깁니다. **서버는 OS 설정을 모릅니다.** 서버가 라이트로 그린 HTML 이 먼저 보이고, JavaScript 가 실행된 뒤 다크로 바뀌면서 화면이 한 번 번쩍입니다.

블로그나 앱이라면 흔히 `<head>` 에 작은 스크립트를 넣어 그리기 전에 클래스를 붙입니다(이 블로그도 그렇게 합니다). 하지만 React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 같은 **라이브러리**는 사용자의 `<head>` 에 스크립트를 넣을 수 없습니다. 컴포넌트 안에서 해결해야 했습니다.

## 1. 모를 때는 CSS 에게 맡긴다

`<ThemeProvider theme="system">` 은 OS 설정을 아직 모를 때(서버 렌더링과 hydration 첫 렌더) 라이트·다크를 **CSS 미디어쿼리**로 고르는 클래스를 씁니다(실제 코드, vanilla-extract).

```ts
/**
 * `theme="system"` 이 아직 OS 설정을 모를 때(서버 렌더링·hydration 첫 렌더) 쓰는 클래스 — CSS 미디어쿼리로 라이트·다크를 고른다.
 * 그래서 JS 가 실행되기 전 첫 화면부터 OS 설정을 따른다(깜빡임 없음).
 */
export const systemThemeClass = style({
  vars: assignVars(vars, lightTokens),
  '@media': { '(prefers-color-scheme: dark)': { vars: assignVars(vars, darkTokens) } },
});
```

모든 컴포넌트는 CSS 변수(`--bestow-*`)로 색을 쓰니, 이 클래스 하나가 변수만 바꾸면 화면 전체가 OS 설정을 따릅니다. JavaScript 가 아직 실행되지 않았어도요. 이때 `data-theme` 은 `'system'` 으로 둡니다.

사용자가 브랜드 색 같은 **덮어쓰기(overrides)** 를 줬다면, 그것도 라이트·다크 두 벌이 필요합니다. 아직 어느 쪽인지 모르니 두 벌을 모두 담은 `<style>` 을 함께 그립니다. 미디어쿼리가 맞는 쪽을 고릅니다.

## 2. 알게 되면 실제 값으로 — useSyncExternalStore

hydration 이 끝나면 실제 OS 설정으로 바꿉니다. 여기서 `useSyncExternalStore` 를 씁니다(실제 코드).

```ts
const query = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const mql = getMediaQuery();
  mql?.addEventListener('change', onChange);
  return () => mql?.removeEventListener('change', onChange);
}

const getSnapshot = (): ThemeName => (getMediaQuery()?.matches ? 'dark' : 'light');
// 서버는 OS 설정을 모른다 — null 이면 ThemeProvider 가 CSS 미디어쿼리로 그린다(systemThemeClass)
const getServerSnapshot = () => null;

export function useSystemTheme(enabled: boolean): ThemeName | null {
  return useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    enabled ? getSnapshot : getLight,
    enabled ? getServerSnapshot : getLight,
  );
}
```

핵심은 `getServerSnapshot` 이 `null` 을 돌려준다는 점입니다.

- 서버 렌더링과 **hydration 첫 렌더**는 `getServerSnapshot` 값(`null`)을 씁니다. 그래서 서버 HTML 과 첫 렌더 결과가 같아 **hydration 불일치가 없습니다.**
- 그 직후 React 가 `getSnapshot` 으로 실제 값을 읽어 다시 그립니다. 이미 CSS 가 같은 색으로 그리고 있었으니 화면은 바뀌지 않습니다.
- `subscribe` 덕분에 사용자가 OS 설정을 바꾸면 바로 따라갑니다.

`useEffect` 안에서 `matchMedia` 를 읽어 상태를 바꾸는 방식보다 짧고, 서버·클라이언트 값을 나누는 의도가 코드에 드러납니다.

## 3. color-scheme 도 함께

테마 클래스마다 `color-scheme` 을 줬습니다. 라이트는 `light`, 다크는 `dark`, 아직 모르는 system 은 `light dark` 입니다. 이 값이 있어야 스크롤바, 기본 폼 컨트롤, 자동 완성 배경처럼 **브라우저가 그리는 부분**도 테마를 따릅니다.

## 확인: JavaScript 를 끄고 열어 본다

"깜빡임 없음" 을 테스트하는 가장 확실한 방법은 **JavaScript 를 끈 채로** 열어 보는 것입니다. 서버 HTML 만으로 다크가 나와야 합니다(Playwright E2E).

```ts
test('JS 가 실행되기 전(서버 HTML)에도 다크로 그린다 — 깜빡임 없음', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' /* … */ });
  const page = await context.newPage();
  await page.goto('/interactive');
  await expect(page.locator(root).first()).toHaveAttribute('data-theme', 'system');
  expect(isDark(await backgroundOf(page.locator('main')))).toBe(true);
});
```

다른 테스트는 OS 설정을 바꾸면 바로 따르는지, 사용자가 토글로 고르면 그 모드로 고정되는지 확인합니다.

## 비용

공짜는 아닙니다. system 모드를 더하자 "앱 기본" 번들(ThemeProvider·Button·Typography·Stack)이 약 390 B 늘었습니다. 미디어쿼리용 CSS 와 hook 때문입니다. 라이브러리에서 이런 기능을 더할 때는 크기 한도와 함께 저울질합니다.

## 정리

- 서버는 OS 설정을 모릅니다. **모를 때는 CSS 미디어쿼리로** 그리면 JavaScript 없이도 첫 화면부터 맞는 색이 나옵니다.
- `useSyncExternalStore` 의 `getServerSnapshot` 을 `null`(모름)로 두면 hydration 불일치 없이 실제 값으로 넘어갑니다.
- 덮어쓰기 색은 라이트·다크 두 벌을 함께 그리고, `color-scheme` 으로 브라우저가 그리는 부분도 맞춥니다.
- 테스트는 **JavaScript 를 끈 채로** 열어 봅니다.
