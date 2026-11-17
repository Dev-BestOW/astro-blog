---
title: 'React 인증번호 입력에 문자 자동 채우기 붙이기'
description: '휴대폰 본인인증 화면의 6칸 인증번호 입력은 칸을 여섯 개 만들면 문자 자동 채우기·붙여넣기·스크린리더가 한꺼번에 어긋납니다. 입력창 하나에 칸 모양만 그리는 방법, autocomplete="one-time-code" 와 WebOTP, 타이머 알림까지 정리합니다.'
pubDate: 2026-11-16
tags: ['react', 'forms', 'accessibility', 'mobile']
draft: false
---

한국 서비스의 회원가입에는 거의 빠짐없이 "인증번호 6자리" 칸이 있습니다. 디자인 시안은 대개 네모 칸 여섯 개이고, 처음 만들 때는 `<input maxLength={1}>` 을 여섯 개 두고 한 글자를 치면 다음 칸으로 포커스를 옮기는 식으로 구현하기 쉽습니다.

그렇게 만들면 화면은 시안과 같지만, 휴대폰에서 문자로 받은 번호를 **자동 채우기** 하거나 **붙여넣기** 할 때, 그리고 **스크린리더**로 들을 때 문제가 생깁니다. 이 글은 그 문제를 입력창 하나로 푸는 방법과, 문자 자동 채우기를 플랫폼별로 붙이는 방법을 정리합니다.

## 칸 여섯 개가 어긋나는 곳

- **자동 채우기:** iOS 키보드 위에 뜨는 "메시지에서 123456" 을 누르면 번호 전체가 **포커스된 입력창 하나**에 들어갑니다. `maxLength={1}` 이면 첫 글자만 남고 나머지는 사라집니다.
- **붙여넣기:** 같은 이유로 첫 칸에만 들어갑니다. 붙여넣기 이벤트를 가로채 여섯 칸에 나눠 넣는 코드를 따로 써야 합니다.
- **지우기:** 빈 칸에서 Backspace 를 누르면 앞 칸으로 돌아가 지워야 하고, 중간 칸을 눌러 고치는 경우도 처리해야 합니다.
- **스크린리더:** 입력창이 여섯 개라 "편집 텍스트" 가 여섯 번 읽힙니다. 각 칸에 이름을 붙이지 않으면 무엇을 넣는 칸인지 알 수 없고, 붙이면 "인증번호 1번째 자리, 2번째 자리…" 로 길어집니다.

결국 브라우저가 입력창 하나에 해 주던 일을 여섯 칸에 맞게 전부 다시 만들게 됩니다.

## 입력창은 하나, 칸은 그림으로

방향을 바꾸면 간단해집니다. **실제 입력창은 하나**만 두고, 칸 여섯 개는 그 값을 보여 주는 그림으로만 그립니다. 입력창은 칸들 위에 투명하게 겹쳐 둡니다.

```tsx
function OtpInput({ length = 6, value, onChange }: Props) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  return (
    <div className="slots">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-describedby="otp-hint"
        className="otp-input"
      />
      {Array.from({ length }, (_, i) => (
        <div key={i} className="slot" data-active={focused && i === active ? '' : undefined} aria-hidden>
          {value[i] ?? ''}
        </div>
      ))}
    </div>
  );
}
```

```css
.slots { position: relative; display: inline-flex; gap: 8px; }
.otp-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  font-size: 16px; /* iOS 는 16px 미만 입력창에 포커스하면 화면을 확대한다 */
}
.otp-input::selection { background: transparent; }
```

이렇게 하면 자동 채우기·붙여넣기·Backspace 는 브라우저 기본 동작 그대로 됩니다. 칸 사이 이동 코드가 필요 없습니다. 스크린리더는 "인증번호, 편집 텍스트, 6자리 숫자를 입력하세요" 처럼 하나로 읽고, 칸 그림은 `aria-hidden` 으로 숨깁니다. 지금 입력할 칸은 `data-active` 로 테두리만 강조합니다.

몇 가지는 직접 겪고 고친 부분입니다.

- **`maxLength` 를 쓰지 않습니다.** "987-654" 처럼 하이픈이 섞인 번호를 붙여 넣으면 `maxLength={6}` 이 숫자만 남기기 **전에** 잘라 "987-65" 가 됩니다. 숫자만 걸러 낸 뒤 직접 자릅니다.
- **`type="number"` 를 쓰지 않습니다.** 앞자리 0 이 사라질 수 있고(`012345`), 데스크톱에서는 스크롤만 해도 값이 바뀝니다. 숫자 키패드는 `inputMode="numeric"` 으로 띄웁니다.
- **값 확인은 `onChange` 한 곳에서** 합니다. 자동 채우기, 붙여넣기, 직접 입력이 모두 같은 경로로 들어옵니다.

## 문자 자동 채우기: iOS

iOS Safari 는 입력창에 `autocomplete="one-time-code"` 만 있으면, 메시지 앱으로 온 문자에서 인증번호를 찾아 키보드 위에 제안합니다. 문자 형식을 따로 맞추지 않아도 대부분 잡힙니다.

다른 사이트의 입력창에 번호가 제안되는 것까지 막고 싶다면 문자 마지막 줄에 도메인을 붙이는 형식을 씁니다. iOS 와 아래의 WebOTP 가 같은 형식을 읽습니다.

```
[서비스명] 인증번호는 123456 입니다.

@example.com #123456
```

## 문자 자동 채우기: Android Chrome (WebOTP)

Android Chrome 에서는 WebOTP API 로 문자에서 번호를 받아 올 수 있습니다. 문자 **마지막 줄**이 위의 `@도메인 #번호` 형식이어야 하고, 사용자가 한 번 동의해야 값이 들어옵니다. HTTPS 페이지에서만 동작합니다.

```tsx
useEffect(() => {
  if (!('OTPCredential' in window)) return; // 지원하지 않는 브라우저는 그냥 직접 입력
  const ac = new AbortController();

  navigator.credentials
    .get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
    .then((credential) => {
      const code = (credential as { code?: string } | null)?.code;
      if (code) setValue(code);
    })
    .catch(() => {
      // 취소·시간 초과는 무시 — 사용자가 직접 입력하면 된다
    });

  return () => ac.abort(); // 화면을 떠나거나 직접 입력해 제출하면 기다리기를 멈춘다
}, []);
```

TypeScript 기본 타입에 `otp` 옵션이 없어서 위처럼 형을 맞춰 줍니다. 받아 온 값은 직접 입력한 값과 똑같이 `setValue` 로 넣으므로, 앞에서 만든 입력창 하나 구조가 그대로 받습니다.

문자 형식에서 확인할 것이 하나 있습니다. 문자 발송 대행사나 통신사가 본문 **끝에** 수신 거부 문구 같은 꼬리말을 붙이면 `@도메인 #번호` 가 마지막 줄이 아니게 되어 WebOTP 가 읽지 못합니다. 실제로 보내지는 문자를 휴대폰에서 직접 받아 확인해 두는 게 좋습니다.

## 다 채우면 자동 제출해도 될까

여섯 자리를 다 채우면 바로 확인 요청을 보내는 화면이 많습니다. 편리하지만 두 가지를 지킵니다.

- **한 번만 보냅니다.** 마지막 글자를 고쳐 쓸 때마다 다시 보내지 않도록, 길이가 **처음 다 찼을 때만** 호출합니다.

  ```ts
  if (next.length === length && prev.length !== length) onComplete(next);
  ```

- **예고 없이 화면을 넘기지 않습니다.** 입력만 했는데 다음 화면으로 넘어가면 예상하지 못한 변화가 됩니다(WCAG 3.2.2). "6자리를 입력하면 자동으로 확인해요" 처럼 미리 알리거나, 확인 버튼도 함께 둡니다.

## 남은 시간과 만료 알림

"02:59" 처럼 남은 시간을 보여 주는 타이머는 `role="timer"` 로 둡니다. timer 는 매초 읽지 않는 역할이라 스크린리더가 숫자를 계속 읽어 대지 않습니다.

대신 **만료되는 순간**은 알려야 합니다. 처음부터 비어 있는 `role="status"` 영역을 두고, 시간이 다 되면 그 안에 "인증 시간이 지났어요. 재전송해 주세요." 를 넣습니다. 알림 영역을 그때 새로 만들어 넣으면 스크린리더가 놓치는 경우가 많습니다. 영역은 처음부터 있어야 합니다.

```tsx
<span role="timer">{formatTime(remaining)}</span>
<p role="status">{expired ? '인증 시간이 지났어요. 재전송해 주세요.' : ''}</p>
```

남은 시간은 `setInterval` 로 1씩 빼지 말고 **끝나는 시각**을 기억해 두고 매번 `endAt - Date.now()` 로 계산합니다. 휴대폰에서 문자 앱을 보러 갔다 오면 백그라운드 탭의 타이머가 느려져, 1씩 빼는 방식은 실제보다 시간이 많이 남은 것처럼 보입니다.

시간 제한이 있는 화면에는 **연장 수단**도 있어야 합니다(KWCAG 6.3.1). 재전송 버튼이 그 역할을 하고, 누르면 입력값과 남은 시간을 처음으로 되돌린 뒤 입력창에 포커스를 돌려줍니다.

## 정리

- 칸 여섯 개를 입력창 여섯 개로 만들지 말고, **입력창 하나 + 칸 그림**으로 만듭니다. 자동 채우기·붙여넣기·지우기·스크린리더가 기본 동작으로 해결됩니다.
- `autocomplete="one-time-code"` 와 `inputMode="numeric"` 을 주고, `maxLength`·`type="number"` 는 쓰지 않습니다.
- iOS 는 `one-time-code` 만으로, Android Chrome 은 WebOTP + 문자 마지막 줄 `@도메인 #번호` 로 자동 채우기가 됩니다.
- 자동 제출은 한 번만, 미리 알리고. 타이머는 `role="timer"`, 만료는 처음부터 있는 `role="status"` 로 한 번 알립니다.

이 구조는 제가 만든 React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 의 `VerificationCodeInput` 과 같습니다. 남은 시간·재전송·만료 알림까지 들어 있고, [컴포넌트 문서](https://bestow-ui.com/components/verification-code-input/) 에서 붙여넣기와 키보드 동작을 직접 해 볼 수 있습니다.
