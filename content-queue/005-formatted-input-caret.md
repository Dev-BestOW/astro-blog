---
title: '하이픈 넣는 입력에서 커서가 끝으로 튀는 이유와 고치는 법'
description: '전화번호 입력에 하이픈을 자동으로 넣으면, 가운데 숫자를 고칠 때 커서가 맨 끝으로 튀고 하이픈 뒤 Backspace 가 먹지 않습니다. 커서 위치를 "글자 위치" 가 아니라 "숫자 개수" 로 기억해 되돌리는 방법과, 이 동작을 실제 브라우저에서 테스트하는 방법을 정리합니다.'
tags: ['react', 'forms', 'javascript']
series: 'BestOW UI 만들기'
draft: false
---

전화번호·사업자등록번호·금액처럼 서식이 붙는 입력은 대개 이렇게 시작합니다. 입력값에서 숫자만 남기고, 서식 함수로 하이픈을 끼워 넣은 문자열을 `value` 로 돌려줍니다.

```tsx
function PhoneInput() {
  const [digits, setDigits] = useState('');
  return (
    <input
      inputMode="tel"
      value={formatPhoneNumber(digits)} // "01012345678" → "010-1234-5678"
      onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 11))}
    />
  );
}
```

끝에 이어서 칠 때는 잘 됩니다. 문제는 **가운데를 고칠 때**입니다. 이 글은 React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 의 서식 입력(전화번호·사업자등록번호·금액 등)이 함께 쓰는 훅을 만들며 정리한 내용입니다.

## 두 가지 증상

1. **커서가 맨 끝으로 튑니다.** `010-123-4567` 에서 첫 `0` 뒤에 `9` 를 넣으면 값은 `091-0123-4567` 이 되는데, 커서는 방금 친 `9` 뒤가 아니라 맨 끝에 가 있습니다. 하이픈 자리가 바뀌면서 브라우저에 들어 있던 글자와 React 가 넣는 글자가 달라지기 때문입니다. 입력창의 값을 코드로 바꾸면 브라우저는 커서를 끝으로 옮깁니다.
2. **하이픈 뒤에서 Backspace 가 먹지 않습니다.** `010-|1234` 에서 Backspace 를 누르면 브라우저는 하이픈을 지웁니다. 그런데 숫자는 그대로라 서식 함수가 하이픈을 곧바로 다시 넣습니다. 사용자에게는 아무리 눌러도 지워지지 않는 칸처럼 보입니다.

## 커서를 "글자 위치" 가 아니라 "숫자 개수" 로 기억하기

커서 위치를 글자 위치(`selectionStart`)로 기억하면 안 됩니다. 하이픈이 생기거나 빠지면 같은 자리가 다른 위치가 되기 때문입니다. 대신 **커서 앞에 숫자가 몇 개 있었는지**를 기억합니다. 서식이 바뀌어도 이 개수는 변하지 않습니다.

1. `onChange` 에서 커서 앞까지의 문자열을 잘라 숫자만 세어 둡니다.
2. 다시 그린 뒤(화면에 그리기 전), 새 문자열에서 숫자를 그만큼 센 바로 뒤로 커서를 옮깁니다.

```ts
/** 서식 문자열에서 의미 있는 문자 count 개 바로 뒤의 위치 */
function caretAfter(display: string, count: number, isMeaningful: (char: string) => boolean): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i++) {
    if (isMeaningful(display[i]!)) seen++;
    if (seen === count) return i + 1;
  }
  return display.length;
}
```

`isMeaningful` 은 "서식 문자가 아닌 글자인가" 입니다. 전화번호는 숫자, 금액은 숫자(쉼표가 서식 문자)입니다. 이렇게 일반화해 두면 같은 훅을 전화번호·사업자등록번호·카드번호·금액·날짜 입력이 함께 씁니다.

훅의 핵심만 줄이면 이렇습니다(줄인 코드 — 비제어 모드, form reset 처리는 뺐습니다).

```ts
const pendingCaret = useRef<number | null>(null);

// 다시 그린 뒤, 화면에 그리기 전에 커서를 둔다
useIsomorphicLayoutEffect(() => {
  const input = inputRef.current;
  if (pendingCaret.current === null || !input || document.activeElement !== input) return;
  const position = caretAfter(input.value, pendingCaret.current, isMeaningful);
  input.setSelectionRange(position, position);
  pendingCaret.current = null;
});

const onChange = (event: ChangeEvent<HTMLInputElement>) => {
  const { value: typed, selectionStart } = event.target;
  const next = sanitize(typed); // 숫자만 + 최대 길이
  const before = sanitize(typed.slice(0, selectionStart ?? typed.length));
  pendingCaret.current = Math.min(before.length, next.length);
  onValueChange(next); // 바깥에는 서식 없는 원본만 넘긴다
};
```

몇 가지를 챙겼습니다.

- **`useLayoutEffect`** 에서 옮깁니다. `useEffect` 면 커서가 끝에 한 번 그려졌다가 돌아오는 깜빡임이 보일 수 있습니다. 서버 렌더링에서는 React 18 이 `useLayoutEffect` 경고를 내므로, 서버에서는 `useEffect` 로 바뀌는 `useIsomorphicLayoutEffect` 를 씁니다.
- **포커스가 있을 때만** 옮깁니다. 바깥에서 값을 바꿨을 때(폼 초기화 등) 다른 칸에 있던 포커스를 빼앗지 않게 합니다.
- **값은 원본과 표시를 나눕니다.** `onValueChange` 에는 `'01012345678'` 처럼 숫자만 넘기고, 하이픈은 화면에만 있습니다. 서버에 보낼 값을 다시 다듬을 필요가 없습니다.

## 하이픈 뒤 Backspace 는 그 앞 숫자를 지운다

두 번째 증상은 `onKeyDown` 에서 막습니다. 커서 바로 앞이 서식 문자이고 선택 영역이 없으면, 기본 동작을 막고 그 앞의 숫자를 원본에서 지웁니다. Delete 도 방향만 바꿔 같게 처리합니다.

```ts
const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  const { selectionStart: start, selectionEnd: end } = input;
  if (start === null || start !== end) return; // 범위 선택은 브라우저에 맡긴다
  const countBefore = (text: string) => [...text].filter(isMeaningful).length;
  if (event.key === 'Backspace' && start > 0 && !isMeaningful(input.value[start - 1]!)) {
    const index = countBefore(input.value.slice(0, start)) - 1; // 서식 문자 앞 숫자
    if (index < 0) return;
    event.preventDefault();
    commit(raw.slice(0, index) + raw.slice(index + 1), index); // 지운 자리에 커서
  }
  // Delete 는 커서 뒤가 서식 문자일 때 그 다음 숫자를 지운다
};
```

## 테스트는 실제 브라우저에서

커서 위치는 jsdom 으로 확인하면 안 됩니다. jsdom 은 커서(selection)를 실제 브라우저와 다르게 다룹니다. 그래서 이 동작은 Storybook 스토리의 `play` 함수로, **실제 Chromium** 에서 확인합니다(CI 에서는 WebKit·Firefox 도).

```ts
export const CaretStays: Story = {
  name: '중간 입력 시 커서 유지',
  args: { defaultValue: '0101234567' },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: '휴대폰 번호' }) as HTMLInputElement;
    await expect(input.value).toBe('010-123-4567');
    input.focus();
    // 하이픈 위치가 바뀌는 입력이어야 의미가 있다
    input.setSelectionRange(1, 1); // "0|10-123-4567"
    await userEvent.keyboard('9'); // 09101234567 → "091-0123-4567"
    await expect(input.value).toBe('091-0123-4567');
    await expect(input.selectionStart).toBe(2); // "09|1-…" — 끝으로 튀지 않는다
  },
};
```

여기서 한 번 속을 뻔했습니다. 처음에는 **서식 전후 문자열이 같은 입력**으로 테스트를 썼는데, 커서를 옮기는 코드를 지워도 테스트가 통과했습니다. 문자열이 같으면 React 가 입력창 값을 다시 쓰지 않아 브라우저가 커서를 그대로 두기 때문입니다. 위 예처럼 **하이픈 자리가 바뀌는 입력**(`010-123-4567` → `091-0123-4567`)을 골라야 테스트가 실제로 그 상황을 만듭니다. 테스트가 너무 쉽게 통과하면, 구현을 일부러 망가뜨려 실패하는지 확인합니다.

Backspace 동작은 커서 위치를 따지지 않고 결과 값만 보면 되므로 jsdom 단위 테스트(`user.keyboard('{Backspace}')`)로 고정했습니다.

## 정리

- 서식을 다시 넣으면 브라우저 값이 바뀌어 커서가 끝으로 갑니다. 커서는 **의미 있는 문자 개수**로 기억했다가, 다시 그린 뒤 `useLayoutEffect` 에서 그 개수 뒤로 옮깁니다.
- 서식 문자 바로 뒤 Backspace·Delete 는 `onKeyDown` 에서 막고 그 너머의 숫자를 지웁니다.
- 바깥에는 원본만 넘기고, 표시는 서식 함수로 만듭니다.
- 커서 테스트는 실제 브라우저에서, **서식 전후가 달라지는 입력**으로 합니다.

이 훅을 쓰는 입력은 [전화번호](https://bestow-ui.com/components/phone-number-input/)·[사업자등록번호](https://bestow-ui.com/components/business-number-input/)·[금액](https://bestow-ui.com/components/amount-input/) 문서 쪽에서 직접 입력해 볼 수 있습니다.
