---
title: '약관 "전체 동의" 체크박스, 스크린리더로 들어 보면 생기는 문제들'
description: '회원가입마다 있는 약관 전체 동의 체크박스를 스크린리더로 들어 보면 "보기" 버튼이 모두 똑같이 읽히고, 필수와 선택이 구분되지 않습니다. 혼합 상태, 필수·선택 표시, 약관 보기 버튼 이름, 펼친 약관 스크롤, 오류 표시까지 하나씩 고쳐 봅니다.'
pubDate: 2026-11-17
updatedDate: 2026-11-18
tags: ['accessibility', 'react', 'forms', 'korean']
series: 'BestOW UI 만들기'
draft: false
---

한국 서비스 회원가입 첫 화면에는 거의 항상 약관 동의 묶음이 있습니다. 맨 위에 "전체 동의", 그 아래 "[필수] 서비스 이용약관", "[필수] 개인정보 수집·이용", "[선택] 마케팅 정보 수신" 같은 항목과 오른쪽 "보기" 링크가 붙는 모양입니다.

눈으로 보면 단순한 체크박스 몇 개지만, 스크린리더로 들어 보면 생각보다 많은 정보가 빠져 있습니다. 이 글은 이 묶음을 만들며 챙긴 것들과, NVDA·VoiceOver 로 들어 확인한 결과를 정리합니다.

## 1. 묶음에 이름을 붙인다

체크박스 여러 개가 하나의 질문에 대한 답이라면 `fieldset` 과 `legend` 로 묶습니다. 그래야 묶음에 들어갈 때 "약관 동의, 그룹" 처럼 무엇에 관한 체크박스들인지 먼저 들립니다.

```tsx
<fieldset>
  <legend>약관 동의</legend>
  {/* 전체 동의 + 항목들 */}
</fieldset>
```

`div` 로만 감싸면 첫 체크박스 "전체 동의" 부터 바로 읽혀, 무엇에 동의하는지는 앞뒤 문맥으로 짐작해야 합니다.

## 2. "전체 동의" 는 세 가지 상태다

일부 항목만 동의했을 때 "전체 동의" 는 체크도 아니고 해제도 아닙니다. 눈으로는 가로줄(−) 로 보여 주는데, 스크린리더에도 같은 상태가 전달돼야 합니다. 네이티브 체크박스는 `indeterminate` 로 이 상태를 가집니다. 다만 HTML 속성이 없어서 DOM 프로퍼티로 넣어야 합니다.

```tsx
function Checkbox({ indeterminate = false, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" {...props} />;
}
```

이렇게 하면 스크린리더가 "전체 동의, 체크 상자, 혼합" 처럼 읽습니다(낱말은 스크린리더마다 다릅니다). 가로줄 아이콘만 그리고 상태를 넣지 않으면 "선택 안 됨" 으로 들려, 이미 몇 개 동의했다는 사실이 전달되지 않습니다.

상태는 따로 저장하지 않고 **항목에서 계산**합니다. 둘을 각각 들고 있으면 언젠가 어긋납니다.

```tsx
const agreedCount = items.filter((item) => agreed.includes(item.value)).length;
const allChecked = items.length > 0 && agreedCount === items.length;
const indeterminate = agreedCount > 0 && !allChecked;

<Checkbox
  label="전체 동의"
  checked={allChecked}
  indeterminate={indeterminate}
  onChange={(e) => setAgreed(e.target.checked ? items.map((i) => i.value) : [])}
/>
```

혼합 상태의 네이티브 체크박스를 누르면 브라우저가 혼합을 풀고 체크로 바꿉니다. 그래서 "일부 동의 → 전체 동의 누름 → 모두 동의" 가 별도 처리 없이 됩니다.

## 3. 필수·선택은 이름 안에

"[필수]" 를 색이 다른 작은 배지로만 그리고 `aria-hidden` 을 주거나, 체크박스 이름과 떨어진 곳에 두면 스크린리더로는 어느 항목이 필수인지 알 수 없습니다. 이름의 **앞**에 넣습니다.

```tsx
<label>
  <input type="checkbox" />
  <span className="tag">필수</span> 서비스 이용약관 동의
</label>
```

여기서 놓치기 쉬운 문제가 하나 있습니다. JSX 에서 배지와 글자를 줄을 바꿔 쓰면 사이 공백이 사라져, 화면에서는 배지 여백 덕에 떨어져 보이지만 스크린리더는 **"필수서비스 이용약관"** 처럼 붙여 읽습니다. `{' '}` 처럼 공백을 직접 넣어야 합니다. 화면만 봐서는 알 수 없는 종류의 문제라, 접근 가능한 이름을 테스트로 확인해 두면 좋습니다(Testing Library 의 `getByRole('checkbox', { name: '필수 서비스 이용약관 동의' })` 처럼).

색만으로 필수를 구분하지 않는 것도 중요합니다(KWCAG 5.4.1 색에 무관한 인식). "필수"·"선택" 글자 자체가 있으니 이 조건은 함께 해결됩니다.

## 4. "보기" 버튼 여러 개가 똑같이 읽힌다

약관마다 "보기" 버튼이 있으면, 스크린리더 사용자가 버튼 목록(NVDA 는 Insert+F7, VoiceOver 는 로터)으로 훑을 때 **"보기, 보기, 보기, 보기"** 만 들립니다. 어떤 약관의 보기인지 알 수 없습니다(WCAG 2.4.6 제목과 레이블 — 레이블은 목적을 설명해야 합니다. "보기" 를 링크로 만들었다면 KWCAG 6.4.3 적절한 링크 텍스트, WCAG 2.4.4 도 같은 것을 요구합니다).

버튼 이름에 약관 이름을 함께 넣습니다. 화면 글자를 바꾸지 않고, 이미 있는 두 요소를 `aria-labelledby` 로 이어 붙입니다.

```tsx
<span id="terms-label">
  <span className="tag">필수</span> 서비스 이용약관 동의
</span>

<button
  type="button"
  aria-labelledby="terms-label terms-toggle"
  aria-expanded={open}
  aria-controls="terms-content"
>
  <span id="terms-toggle">{open ? '접기' : '보기'}</span>
</button>
```

이제 버튼은 "필수 서비스 이용약관 동의 보기, 버튼, 접힘" 으로 읽힙니다. 이름 안에 화면 글자 "보기" 가 그대로 들어 있어서 음성 명령으로 "보기 누르기" 를 말하는 사용자에게도 맞습니다(WCAG 2.5.3 이름 안의 레이블).

`aria-expanded` 를 주면 펼침·접힘 상태도 함께 들립니다. 보기를 새 창이나 모달로 여는 서비스도 많은데, 그 경우에는 `aria-expanded` 대신 모달 쪽 접근성(포커스 가두기, 닫으면 버튼으로 돌아오기)을 챙기면 됩니다.

## 5. 펼친 약관은 키보드로도 스크롤돼야 한다

약관 전문은 길어서 높이를 정하고 `overflow: auto` 로 스크롤시키는 경우가 많습니다. 이 영역은 마우스 휠이나 터치로만 스크롤되고, **키보드 사용자는 내용을 끝까지 읽을 수 없습니다**. 안에 링크 같은 포커스 받는 요소가 없으면 Tab 으로 들어갈 수도 없기 때문입니다.

포커스를 받을 수 있게 하고 이름을 붙입니다.

```tsx
<div id="terms-content" role="region" aria-labelledby="terms-label" tabIndex={0} className="terms-content">
  {content}
</div>
```

`tabIndex={0}` 이 있으면 Tab 으로 들어가 화살표 키로 스크롤할 수 있습니다. 포커스를 받는 영역에는 이름이 있어야 하므로 `role="region"` 과 약관 이름을 붙입니다. 이 조건은 axe 의 `scrollable-region-focusable` 규칙으로 자동 검사할 수 있습니다.

## 6. 필수에 동의하지 않았을 때

필수 항목에 동의하지 않으면 다음으로 넘어가지 못하게 해야 합니다. 흔한 방법은 다음 버튼을 `disabled` 로 두는 것인데, 저는 **버튼을 살려 두고 누르면 오류를 보여 주는 쪽**을 택했습니다.

- `disabled` 버튼은 Tab 으로 닿지 않아, 키보드·스크린리더 사용자는 버튼이 있다는 것도, 왜 누를 수 없는지도 알기 어렵습니다.
- 눌렀을 때 "필수 약관에 동의해 주세요" 를 묶음 아래에 보여 주고, 동의하지 않은 **필수 항목만** 오류 표시(`aria-invalid`)를 합니다. 선택 항목까지 빨갛게 표시하면 선택 항목도 동의해야 하는 것처럼 보입니다.
- 오류 문구는 `fieldset` 에 `aria-describedby` 로 연결합니다. 폼 위에 오류 요약을 두고 링크로 묶음에 포커스를 옮기면, 긴 가입 폼에서 어디가 문제인지 바로 찾아갈 수 있습니다.

검사 자체는 순수 함수로 두면 서버에서도 같은 기준으로 쓸 수 있습니다.

```ts
function hasAllRequiredAgreements(items: AgreementItem[], agreed: string[]) {
  return items.every((item) => !item.required || agreed.includes(item.value));
}
```

## 접근성 밖의 이야기: 선택 동의는 정말 선택이어야 한다

접근성과는 다른 이야기지만 함께 챙길 것이 있습니다. 개인정보 보호법은 동의를 받을 때 각 사항을 구분해 알리고, 선택 사항에 동의하지 않았다는 이유로 서비스 제공을 거부하지 못하게 합니다. 화면으로 옮기면 이렇습니다.

- 필수와 선택을 **항목마다 분명히** 표시합니다(3번에서 이미 했습니다).
- 선택 항목을 **처음부터 체크해 두지 않습니다.**
- 선택 항목을 동의하지 않아도 다음으로 넘어갈 수 있어야 합니다(6번 검사가 필수만 보는 이유).

"전체 동의" 는 편의 기능일 뿐입니다. 전체 동의 하나만 두고 항목을 숨기는 화면은 법적으로도, 접근성으로도 문제가 됩니다. 실제 서비스의 동의 문구와 항목 구성은 법무 검토를 받으세요.

## 정리

| 문제                           | 해결                                                     |
| ------------------------------ | -------------------------------------------------------- |
| 무엇에 관한 체크박스인지 모름  | `fieldset` + `legend`                                    |
| 일부 동의 상태가 전달되지 않음 | 네이티브 `indeterminate`, 상태는 항목에서 계산           |
| 필수·선택 구분이 안 들림       | 이름 앞에 "필수"/"선택" 글자, 사이 공백 확인             |
| "보기" 버튼이 모두 같은 이름   | `aria-labelledby` 로 약관 이름 + "보기", `aria-expanded` |
| 펼친 약관을 키보드로 못 읽음   | `role="region"` + 이름 + `tabIndex={0}`                  |
| 왜 다음으로 못 가는지 모름     | 버튼은 살려 두고, 필수 항목만 오류 표시 + 설명 연결      |

이 중 5번의 스크롤 영역은 axe 같은 자동 검사가 잡아 주지만, 3번의 붙어 읽히는 공백과 4번의 같은 이름 버튼은 자동 검사를 통과합니다. 이름은 테스트로 고정해 두고, 한 번은 스크린리더로 직접 들어 보는 걸 권합니다. 저는 NVDA(Chrome)와 VoiceOver(Safari)로 혼합 상태와 "필수 …/선택 …" 으로 시작하는 이름이 들리는 것을 확인했습니다.

위 내용은 제가 만든 React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 의 `AgreementGroup` 에 그대로 들어 있습니다. [컴포넌트 문서](https://bestow-ui.com/components/agreement-group/) 에서 키보드와 스크린리더로 직접 확인해 볼 수 있습니다.
