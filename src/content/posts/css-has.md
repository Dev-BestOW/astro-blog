---
pubDate: 2026-07-12
updatedDate: 2026-11-25
title: 'CSS :has() 부모 선택자 — 사용법과 실전 패턴'
description: '20년 넘게 CSS에 없던 부모 선택자 :has()의 사용법, 형제·상태 선택 패턴, 자바스크립트를 걷어내는 예와 브라우저 지원을 정리합니다.'
tags: ['css', 'frontend']
---

CSS에서 "자식 상태에 따라 부모를 스타일링"하려면 오랫동안 자바스크립트가 필요했습니다. `:has()`가 이 20년 묵은 공백을 메웠고, 단순한 부모 선택자 이상입니다.

## 기본: 자식으로 부모를 선택

```css
/* figcaption을 가진 figure에만 여백 */
figure:has(figcaption) {
  margin-block: 2rem;
}

/* 유효하지 않은 입력을 포함한 form을 강조 */
form:has(:invalid) {
  border: 1px solid var(--danger);
}
```

`:has(X)`는 "X를 후손으로 가진 요소"를 선택합니다. 즉 **조건은 안쪽, 스타일 대상은 바깥쪽**입니다.

## 부모 선택을 넘어 — 관계 선택자

`:has()`는 결합자와 함께 쓰면 형제·상태 조합까지 표현합니다.

```css
/* 체크된 체크박스를 감싼 라벨 */
label:has(input:checked) {
  font-weight: 700;
}

/* 뒤에 이미지가 오는 제목의 아래 여백 제거 */
h2:has(+ img) {
  margin-bottom: 0;
}

/* 카드 안에 이미지가 있으면 그리드 레이아웃으로 */
.card:has(img) {
  display: grid;
  grid-template-columns: auto 1fr;
}
```

## JS를 걷어내는 실전 패턴

**"자식이 하나도 없을 때" 빈 상태**

```css
.list:not(:has(li)) {
  display: none;
} /* 항목 없으면 목록 숨김 */
```

**폼 유효성에 따른 제출 버튼** — 예전엔 입력마다 이벤트를 달아 JS로 토글하던 것을, 상태 기반 CSS로 상당 부분 대체할 수 있습니다.

## 실제로 쓴 곳 — select 안내 문구를 흐리게

제가 만드는 디자인 시스템 [BestOW UI](https://bestow-ui.com/)의 NativeSelect는 브라우저 기본 `<select>`를 감싼 컴포넌트입니다. `placeholder`를 주면 값이 `''`인 고를 수 없는 첫 항목으로 "지역을 고르세요" 같은 안내 문구를 넣습니다.

```html
<select>
  <option value="" disabled>지역을 고르세요</option>
  <option value="seoul">서울</option>
</select>
```

입력 칸의 placeholder처럼 이 문구가 선택된 동안만 글자를 흐리게 하고 싶었는데, `<select>`에는 `::placeholder`가 없습니다. 흔히 쓰는 우회는 `select:invalid`입니다. 그런데 이 방법은 `required`가 있어야만 동작합니다. 꼭 고르지 않아도 되는 select에서는 빈 값도 "유효"하기 때문입니다.

`:has()`로는 "선택된 option의 값이 빈 문자열인가"를 직접 물을 수 있습니다. `:checked`는 체크박스뿐 아니라 선택된 `<option>`에도 걸립니다.

```ts
// NativeSelect.css.ts (vanilla-extract, 줄인 코드)
selectors: {
  // 값이 '' 인 placeholder 가 선택된 동안은 흐린 글자 (Select 의 placeholder 와 같은 색)
  '&:has(option[value=""]:checked)': { color: vars.color.fg.subtle },
},
```

위와 같은 `<select>` 세 개를 시험 페이지에 두고 Chrome 158에서 계산된 글자색을 읽어 비교했습니다(Playwright). `:has()` 줄은 위의 `:has(option[value=""]:checked)`입니다.

| 방법                    | 안내 문구일 때 흐려지나 |
| ----------------------- | ----------------------- |
| `:has()`                | 예                      |
| `:invalid`              | 아니요                  |
| `:invalid` + `required` | 예                      |

다른 값을 고르면 셋 다 원래 색으로 돌아갑니다.

`change` 이벤트를 듣고 클래스를 바꾸는 자바스크립트가 없어도, 선택 상태가 곧 스타일 조건이 됩니다. 다만 이 선택자는 단위 테스트 환경(jsdom)에서 계산되지 않습니다. 그래서 BestOW UI는 Playwright E2E에서 실제 브라우저로 "값을 고르면 글자색이 바뀐다"를 확인합니다.

## 성능과 지원

- **지원**: 모든 최신 브라우저에서 사용 가능합니다. Firefox가 121(2023년 말)에 합류하며 Baseline에 올랐습니다. 아주 구형을 지원해야 하면 폴백을 고려하세요.
- **성능**: `:has()`는 브라우저가 잘 최적화하지만, `*:has(...)`처럼 대상이 지나치게 넓거나 복잡한 셀렉터를 남발하면 스타일 계산 비용이 커질 수 있습니다. 선택 대상을 좁게 유지하세요.

같은 "부모 기준으로 스타일을 바꾼다"는 고민의 다른 축은 크기입니다. 놓인 자리의 너비에 반응하는 방법은 [컨테이너 쿼리](/posts/container-queries/) 글에 정리했습니다.

> `:has()`는 "상태를 클래스로 승격시켜 JS로 토글"하던 코드의 상당수를 없앱니다. 자식/형제 상태로 스타일이 갈린다면 먼저 `:has()`로 표현되는지 생각해 보세요.
