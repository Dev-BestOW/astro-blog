---
title: '대표색 하나로 대비 4.5:1을 보장하는 테마 만들기'
description: '브랜드 색 hex 하나로 라이트·다크 색 세트를 만들면서, 어떤 색을 넣어도 글자 대비 4.5:1과 포커스 링 3:1을 지키는 방법을 OKLCH와 실제 계산 예(노랑·초록)로 정리합니다.'
pubDate: 2026-10-21
tags: ['accessibility', 'design-system', 'color', 'oklch']
draft: false
---

디자인 시스템의 "브랜드 테마" 는 보통 이렇게 시작합니다. 대표색을 넣으면 버튼이 그 색이 됩니다. 문제는 그 다음입니다. 노란색을 넣으면 흰 글자가 안 보이고, 다크 모드에서 hover 하면 글자가 흐려지고, 밝은 색이면 키보드 포커스 링이 배경에 묻힙니다. 대비 확인은 보통 "쓰는 쪽 몫" 으로 남습니다.

BestOW UI 에서는 이걸 함수 하나로 해결하기로 했습니다.

```ts
import { createTheme, createIntentColors, ThemeProvider } from '@bestow-ui/react';

const brand = createTheme(createIntentColors('primary', '#facc15'));

<ThemeProvider theme={mode} overrides={brand}>…</ThemeProvider>
```

hex 하나를 넣으면 라이트·다크 각각의 버튼 배경(solid), hover, 그 위 글자색(contrast), 연한 배경(subtle), 글자용 색(text), 포커스 링 색을 만듭니다. 약속은 하나입니다. **어떤 색을 넣어도 글자 대비 4.5:1, 포커스 링 3:1** (WCAG 2.x AA, KWCAG 5.4.3).

## 왜 OKLCH 인가

색을 밝게 하거나 어둡게 할 때 HSL 의 L 을 바꾸면, 같은 "L 60%" 라도 노랑과 파랑의 실제 밝기가 크게 다릅니다. OKLCH 는 사람이 느끼는 밝기(L)와 채도(C), 색상(H)을 나눈 색 공간이라, L 만 움직이면 색상은 그대로 두고 밝기만 바꿀 수 있습니다. 대표색을 OKLCH 로 바꾼 뒤 L 을 움직이며 대비를 계산하고, sRGB 범위를 벗어나면 채도를 줄여 맞춥니다.

## 1. 버튼 배경과 그 위 글자

먼저 흰 글자가 4.5:1 을 넘는지, 아니면 짙은 글자(#212529)가 넘는지 봅니다.

- 보라 #7c3aed → 흰 글자 5.70:1. 그대로 씁니다.
- 노랑 #facc15 → 흰 글자는 안 되고 짙은 글자 10.07:1. 짙은 글자를 씁니다.
- **초록 #059669 → 둘 다 4.5 가 안 나옵니다.** 이런 중간 밝기 색이 진짜 문제입니다.

중간 밝기 색은 L 을 0.005 씩 위아래로 옮겨 가며, 흰 글자로 4.5 가 되는 가장 가까운 어두운 색과 짙은 글자로 4.5 가 되는 가장 가까운 밝은 색 중 **먼저 닿는 쪽**을 고릅니다. 브랜드 색에서 가장 덜 벗어나기 위해서입니다. #059669 는 #1b9e70 + 짙은 글자(4.53:1)가 됩니다.

## 2. hover 는 방향이 바뀔 수 있습니다

hover 는 보통 "조금 어둡게" 합니다. 그런데 짙은 글자를 쓰는 초록 버튼을 어둡게 하면 글자 대비가 떨어집니다. 그래서 원하는 방향으로 옮긴 색의 대비가 4.5 아래면 **반대 방향**으로 옮깁니다.

```ts
function hoverFor(base, delta, contrast) {
  const preferred = withL(base, base.l + delta);
  if (contrastRatio(contrast, preferred) >= 4.5) return preferred;
  return withL(base, base.l - delta); // 대비가 떨어지면 반대로
}
```

초록 #1b9e70 의 hover 는 어둡게가 아니라 밝게 #38b182(5.71:1)가 됩니다. 다크 모드도 같습니다. 파란 버튼을 밝게 하면 흰 글자 대비가 떨어지므로 어둡게 합니다.

## 3. 글자용 색은 배경 세 곳에서 모두 확인합니다

링크나 강조 글자에 쓰는 text 색은 기본 배경 위에만 있지 않습니다. 연한 배경(subtle)과 그 hover 위에도 놓입니다. 그래서 L 을 조금씩 옮기며 **세 배경 모두에서** 4.5 를 넘는 첫 색을 고릅니다. 노랑의 라이트 text 는 #7c6300(흰 배경 5.77:1)이 됩니다. 다크 모드는 반대로 밝은 쪽으로 찾습니다(보라의 다크 text #b29bff, 7.64:1).

## 4. 포커스 링 — 테마 빌더가 찾아낸 버그

처음 버전은 포커스 링을 그냥 버튼 색으로 칠했습니다. 테마 빌더 페이지(색을 고르면 대비 리포트를 보여 주는 페이지)를 만들면서 노랑·하늘·분홍 같은 밝은 색을 넣어 보니 **라이트 모드 포커스 링 대비가 1.5~2.8:1** 이었습니다. 포커스 링은 그래픽이라 배경과 3:1 이 필요합니다(WCAG 1.4.11).

```ts
const focusOn = (candidate, fallback, bg) => (contrastRatio(candidate, bg) >= 3 ? candidate : fallback);
```

버튼 색이 3:1 미만이면, 이미 4.5:1 이 보장된 text 색으로 대신합니다. 노랑 #facc15 는 흰 배경과 1.53:1 이라 포커스 링은 #7c6300(5.77:1)이 됩니다.

## 보장은 테스트로

"보장" 이라는 말은 테스트가 있어야 쓸 수 있습니다. 대표색 8개(보라·노랑·하늘·거의 검정·분홍·초록 둘·주황)와 **색 공간 전체에서 고르게 뽑은 표본**에 대해 라이트·다크의 solid·hover·text·포커스 링 대비를 단위 테스트로 확인하고, Storybook 의 모든 스토리를 라이트·다크 두 테마로 axe 검사합니다. 브랜드 테마를 입힌 예제 앱도 E2E 에서 axe 를 돌립니다.

남은 한계도 있습니다. 대비를 맞추느라 버튼 색이 넣은 색과 조금 달라질 수 있습니다(초록 #059669 → #1b9e70). 브랜드 가이드상 정확한 색이 꼭 필요하면 `createTheme` 에 값을 직접 넣어 덮어쓸 수 있고, 그때 대비는 다시 쓰는 쪽 몫이 됩니다.

- 테마 빌더(색을 골라 대비 리포트 보기): https://dev-bestow.github.io/BestOW-UI/?path=/story/foundations-theme-builder--builder
- 소스: https://github.com/Dev-BestOW/BestOW-UI/blob/main/packages/react/src/theme/color.ts
