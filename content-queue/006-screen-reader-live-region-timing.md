---
title: '스크린리더가 aria-live 알림을 안 읽을 때 — 원인과 고치는 법'
description: 'live region 을 새로 만들거나 입력·포커스 이동과 같은 순간에 바꾸면 VoiceOver 가 버립니다. 직접 들으며 고친 네 사례입니다.'
tags: ['accessibility', 'react', 'forms']
series: 'BestOW UI 만들기'
draft: false
---

화면에 메시지가 뜨는데 스크린리더는 아무 말도 하지 않는 경우가 있습니다. axe 같은 자동 검사도, E2E 테스트도 통과합니다. 마크업에는 문제가 없고 **타이밍**이 문제이기 때문입니다.

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 의 주요 컴포넌트를 VoiceOver(macOS + Safari)로 직접 들어 본 날(2026-10-21), 13개 점검 항목 중 3건에서 기대한 알림이 들리지 않아 그 자리에서 고쳤습니다. 사업자등록번호 입력은 통과했지만 입력하는 순간에는 오류를 알려 주지 않아 개선 후보로 남겼고, 이틀 뒤(2026-10-23) 고쳤습니다. 이 글은 이 네 건의 원인과 고친 방법입니다. ([자동 검사로 어디까지 지킬 수 있는지는 앞 글](/posts/kwcag-automated-testing/)에 정리했습니다.)

## 알림이 모자랐던 네 가지

| 컴포넌트                  | 기대한 알림                         | 실제                                               |
| ------------------------- | ----------------------------------- | -------------------------------------------------- |
| Combobox(검색해서 고르기) | 검색 결과가 없으면 "결과가 없어요"  | 들리지 않음                                        |
| FileUpload                | 파일을 지우면 "○○ 삭제됨"           | 들리지 않음                                        |
| NumberInput               | 값을 바꾸면 "2석"                   | "선택 항목 대치됨, 2" (단위 없음)                  |
| 사업자등록번호 입력       | 10자리를 채운 순간 틀린 번호면 오류 | 입력 순간엔 없음, 칸에 다시 들어가야 설명으로 읽힘 |

## 규칙 1: live region 은 처음부터 있어야 한다

`aria-live`(또는 `role="status"`) 영역은 **안의 내용이 바뀔 때** 읽힙니다. 그래서 메시지가 생길 때 영역을 함께 만들면 읽히지 않을 수 있습니다. 스크린리더가 영역을 알기 전에 이미 글자가 들어 있기 때문입니다.

```tsx
// ❌ 메시지가 생길 때 영역도 함께 생긴다
{error && <p role="status">{error}</p>}

// ✅ 영역은 늘 있고, 안의 글자만 바뀐다
<span role="status" className={visuallyHidden}>{announcement}</span>
```

BestOW UI 의 번호 입력(사업자·카드·계좌 등)은 화면에 보이는 오류 문구와 별도로, 처음부터 비어 있는 `role="status"` 영역을 하나 둡니다(화면에는 숨김).

## 규칙 2: 입력·포커스 이동과 같은 순간에 바꾸지 않는다

Combobox 는 처음부터 있는 영역을 썼는데도 "결과가 없어요" 가 들리지 않았습니다. 원인은 타이밍이었습니다. 글자를 치는 그 순간 결과가 0건이 되어 알림을 바꾸면, VoiceOver 는 **방금 입력한 글자를 읽느라** 알림을 버립니다. 파일 삭제도 같았습니다. 삭제 버튼을 누르면 포커스가 다음 요소로 옮겨지는데, VoiceOver 가 그 요소를 읽는 순간에 "삭제됨" 이 들어와 묻혔습니다.

그래서 알림을 **늦춰서** 넣습니다.

- 입력 중에 생긴 메시지: 입력이 **0.8초** 멈춘 뒤
- 포커스 이동과 함께 생긴 메시지: **0.5초** 뒤

입력 중 알림은 훅 하나로 모았습니다(실제 코드).

```ts
/** 입력이 멈춘 뒤 알림을 넣기까지 기다리는 시간 (Combobox "결과가 없어요" 와 같은 값) */
export const ANNOUNCE_DELAY = 800;

export function useDelayedAnnouncement(message: string, delay = ANNOUNCE_DELAY): string {
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(message), message ? delay : 0);
    return () => clearTimeout(timer);
  }, [message, delay]);
  return message && announced === message ? message : '';
}
```

- 글자를 칠 때마다 `message` 가 바뀌면 타이머가 다시 시작되므로, **입력이 멈춘 뒤에만** 알림이 들어갑니다.
- 메시지가 `''` 가 되면 바로 비웁니다. 고쳤다가 같은 오류가 다시 나도 영역의 내용이 바뀌어 다시 읽힙니다.

사업자등록번호 입력은 이렇게 씁니다(줄인 코드). 10자리를 다 채웠고 틀린 번호일 때만 메시지가 생깁니다.

```tsx
const announcement = useDelayedAnnouncement(showAuto && complete ? invalidText : '');
// …
<span role="status" className={visuallyHidden}>{announcement}</span>
```

Combobox 는 "어떤 검색어에 대한 알림인지" 를 기억해, 검색어가 바뀌면 다시 0.8초를 기다립니다. 파일 삭제는 영역을 먼저 비운 뒤 0.5초 뒤에 글자를 넣습니다.

```ts
const announce = (message: string, delay = 0) => {
  clearTimeout(announceTimer.current);
  if (delay === 0) return setAnnouncement(message);
  setAnnouncement('');
  announceTimer.current = setTimeout(() => setAnnouncement(message), delay);
};
```

## NumberInput 은 다른 문제였다

NumberInput 은 타이밍이 아니라 **Safari 가 `aria-valuetext` 를 읽지 않는 것**이 원인이었습니다. 텍스트 입력 형태의 spinbutton 에서는 값 문구("2석") 대신 입력창 글자를 "선택 항목 대치됨, 2" 로 읽었습니다. 그래서 값이 바뀔 때 "2석" 을 따로 알리는 영역(`aria-live="assertive"`)을 더했습니다.

이렇게 한 스크린리더에 맞춘 수정이 다른 스크린리더에서 **두 번 읽히지 않는지**도 확인해야 합니다. 이틀 뒤 Windows 의 NVDA + Chrome 으로 같은 13개 항목을 다시 들었고, "2석" 이 겹쳐 읽히지 않았습니다. 이번에는 고칠 것이 하나도 나오지 않았습니다.

## 지연 시간에 대해

0.8초와 0.5초는 표준이 정한 값이 아니라, VoiceOver 로 들어 보며 정한 값입니다. 너무 짧으면 여전히 묻히고, 너무 길면 사용자가 다음 행동을 한 뒤에 알림이 옵니다. 다른 스크린리더·다른 속도 설정에서는 다르게 느껴질 수 있습니다. 그래서 값을 한곳(`ANNOUNCE_DELAY`)에 모아 두고, 새 스크린리더로 점검할 때마다 다시 확인합니다.

## 정리

- live region 은 **처음부터 비어 있는 채로** 두고, 안의 글자만 바꿉니다.
- 입력이나 포커스 이동과 **같은 순간**에 바꾸면 VoiceOver 가 버립니다. 입력 중 메시지는 멈춘 뒤 0.8초, 포커스 이동과 함께 생긴 메시지는 0.5초 뒤에 넣습니다.
- 한 스크린리더에 맞춘 수정은 다른 스크린리더에서 겹치지 않는지 확인합니다.
- 이런 문제는 자동 검사로 잡히지 않습니다. 한 번은 직접 들어 보고, 찾은 동작은 단위 테스트로 고정합니다.

[사업자등록번호 입력 문서](https://bestow-ui.com/components/business-number-input/)에서 틀린 번호(예: 1234567890)를 넣어 보면, 화면의 오류와 함께 잠시 뒤 스크린리더 알림이 나옵니다.
