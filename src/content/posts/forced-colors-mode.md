---
pubDate: 2026-11-21
title: 'Windows 고대비 모드 대응 — forced-colors CSS'
description: '고대비 모드는 배경색을 시스템 색으로 바꿔 켜진 스위치·선택된 탭이 사라집니다. forced-colors 로 다시 그리는 법과 검사 함정.'
tags: ['accessibility', 'css', 'testing']
series: 'BestOW UI 만들기'
draft: false
---

Windows 의 **대비 테마**(예전 이름 고대비 모드)를 켜면 브라우저는 페이지의 색을 사용자가 고른 몇 가지 시스템 색으로 바꿉니다. 글자는 글자색, 배경은 배경색, 링크는 링크색으로 통일되고, 배경 이미지와 그림자는 지워집니다. 저시력 사용자가 쓰는 기능이고, CSS 로는 `@media (forced-colors: active)` 로 감지합니다.

문제는 **상태를 배경색이나 그림자로만 보여 주던 UI** 입니다. React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 를 이 모드에서 찍어 보니(2026-10-19) 이런 것들이 보이지 않았습니다.

- 켜진 **Switch** — 트랙 배경이 지워져 스위치 자체가 사라짐
- 선택된 **탭**, **SegmentedControl** 의 선택 항목, 메뉴·목록에서 **강조된 항목**, 페이지 이동의 **현재 페이지**
- **Progress** 막대, **Slider** 의 채워진 범위, **Stepper** 의 연결선

모두 "선택됐다·켜졌다·얼마나 찼다" 를 배경색으로만 표현한 곳입니다.

## 시스템 색으로 다시 그린다

forced-colors 모드에서는 CSS 에 **시스템 색 이름**을 쓸 수 있습니다. 사용자가 고른 테마에 맞는 실제 색으로 바뀝니다.

| 시스템 색                     | 뜻                                                      |
| ----------------------------- | ------------------------------------------------------- |
| `Canvas` / `CanvasText`       | 배경 / 글자                                             |
| `Highlight` / `HighlightText` | 선택된 항목의 배경 / 글자(운영체제 목록 선택과 같은 색) |
| `GrayText`                    | 비활성                                                  |

"선택됨·현재·강조" 는 운영체제가 선택을 보여 줄 때 쓰는 `Highlight` 로 맞췄습니다. 여러 컴포넌트가 쓰도록 한 파일에 모았습니다(실제 코드).

```ts
export const forcedColors = '(forced-colors: active)';

/** "선택됨·현재·강조" — 운영체제 목록 선택과 같은 색. forced-color-adjust: none 이라야 지정한 시스템 색이 그대로 쓰인다 */
export const systemHighlight = {
  forcedColorAdjust: 'none',
  backgroundColor: 'Highlight',
  color: 'HighlightText',
} as const;
```

`forced-color-adjust: none` 이 핵심입니다. 이게 없으면 브라우저가 지정한 배경색까지 다시 바꿔 버립니다.

Switch 는 이렇게 다시 그립니다(vanilla-extract, 실제 코드).

```ts
'@media': {
  [forcedColors]: {
    // 트랙 배경이 지워져 스위치가 사라진다 → 테두리, 켜지면 시스템 강조색
    border: '1px solid CanvasText',
    selectors: {
      // hover 규칙(켜짐 + hover = 원래 색)이 더 구체적이라 함께 덮는다
      '&[data-state="checked"], &[data-state="checked"]:hover:not(:disabled)': {
        ...systemHighlight,
        borderColor: 'Highlight',
      },
    },
  },
},
```

꺼져 있을 때는 테두리로 모양을 보이고, 켜지면 트랙을 `Highlight` 로 칠합니다. 손잡이(thumb)도 같은 방식으로 `CanvasText` / `HighlightText` 로 칠해, 켜짐과 꺼짐에서 대비가 뒤집히게 했습니다.

## 함정 1: 더 구체적인 hover 규칙이 이긴다

위 코드의 선택자에 `:hover` 가 함께 들어간 이유가 있습니다. 평소 스타일에 "켜짐 + hover 일 때 색" 규칙이 따로 있었는데, 이 규칙이 고대비용 규칙보다 **선택자가 더 구체적**이라 마우스를 올리면 고대비용 색을 덮어 버렸습니다. 켜진 스위치에 마우스를 올리면 다시 사라지는 셈입니다. 고대비 규칙을 쓸 때는 같은 상태의 `:hover` 규칙도 함께 덮어야 합니다.

## 함정 2: 네이티브 컨트롤을 꾸몄다면 되돌린다

라디오 버튼은 네이티브 `<input type="radio">` 에 `appearance: none` 을 주고 선택 점을 `box-shadow` 로 그렸습니다. 그런데 forced-colors 모드는 그림자를 지웁니다. 선택 점이 사라지는 것이죠. 그래서 이 모드에서만 `appearance: auto` 로 **브라우저 기본 라디오로 되돌립니다**. 운영체제가 그리는 컨트롤은 고대비에서 알아서 보입니다.

```ts
'@media': {
  '(forced-colors: active)': { appearance: 'auto' },
},
```

## 검사하기: "투명이 아닌가" 로는 부족하다

한 번 고치고 끝내면 다음 변경에서 다시 깨집니다. Playwright 로 E2E 를 만들었습니다. Playwright 는 `forcedColors: 'active'` 로 이 모드를 흉내 낼 수 있습니다. 공식 문서에는 브라우저별 차이가 적혀 있지 않지만, 저희가 확인했을 때 **실제로 강제 색상까지 칠해진 것은 Chromium** 이어서 이 테스트는 Chromium 에서만 돌립니다.

처음에는 "선택된 탭의 배경이 투명이 아닌가" 를 확인했습니다. 그런데 고대비 처리를 일부러 지워도 테스트가 통과했습니다. 버튼은 고대비에서 브라우저가 기본 버튼색(`ButtonFace`)으로 칠하기 때문에, 상태 표시가 없어도 "투명이 아님" 이 됩니다.

그래서 **배경이 시스템 강조색(Highlight)과 같은지**를 봅니다. 시스템 강조색의 실제 값은 테마마다 다르니, 페이지에 잠깐 요소를 만들어 읽어 옵니다.

```ts
async function expectSystemHighlight(locator: Locator) {
  const highlight = await locator.page().evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'forced-color-adjust:none;background:Highlight;position:absolute;width:1px;height:1px';
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  // 배경색 전환 애니메이션(Switch 등) 중에는 중간 색이 읽힌다 — 목표 색이 될 때까지 다시 읽는다
  await expect
    .poll(() => locator.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toBe(highlight);
}
```

이렇게 강화한 검사가 바로 위의 **hover 함정**을 찾아냈습니다. 그리고 `expect.poll` 은 나중에 CI 에서 붙였습니다. Switch 의 색 전환 애니메이션 중간 값을 읽어 실패했기 때문입니다.

테스트는 켜진 Switch, 선택된 탭, SegmentedControl, 현재 페이지, 키보드로 연 메뉴의 강조 항목, Slider 범위를 확인합니다. 지금은 11개 컴포넌트(Tabs·Pagination·Calendar·Progress·DropdownMenu·Slider·Stepper·SegmentedControl·Switch·Select·Tag)가 forced-colors 규칙을 갖고 있습니다.

## 정리

- 고대비(forced-colors) 모드는 배경색·그림자를 지웁니다. **상태를 배경색으로만 표현한 곳**을 먼저 찾습니다.
- `@media (forced-colors: active)` 에서 `Highlight`·`CanvasText` 같은 시스템 색으로 다시 그리고, `forced-color-adjust: none` 을 함께 둡니다.
- 같은 상태의 **더 구체적인 규칙(:hover 등)** 도 함께 덮습니다.
- 꾸민 네이티브 컨트롤은 이 모드에서 `appearance: auto` 로 되돌리는 것이 가장 확실합니다.
- 검사는 "투명이 아닌가" 가 아니라 "시스템 강조색인가" 로 합니다. 검사를 일부러 망가뜨려 실패하는지 확인하면 이런 약한 검사를 찾을 수 있습니다.
