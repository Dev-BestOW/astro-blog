---
pubDate: 2026-07-14
updatedDate: 2026-11-25
title: 'INP와 FID 차이 — 바뀐 반응성 지표와 개선 방법'
description: 'Core Web Vitals 반응성 지표가 FID에서 INP로 바뀌었습니다. INP가 재는 것, 기준값 200ms, 개선 방법을 정리합니다.'
tags: ['performance', 'frontend']
---

2024년 3월 12일, 구글은 Core Web Vitals의 반응성(responsiveness) 지표를 **FID(First Input Delay)에서 INP(Interaction to Next Paint)로 교체**했습니다. FID로 통과하던 사이트가 INP에선 떨어질 수 있어, 두 지표가 무엇을 재는지부터 정확히 구분해야 합니다.

## FID는 왜 부족했나

FID는 **첫 상호작용의 입력 지연만** 측정했습니다. 즉 "첫 클릭이 얼마나 빨리 반응을 시작했나"만 봤죠. 그래서:

- 첫 클릭만 빠르면 이후 모든 인터랙션이 굼떠도 **통과**했습니다.
- "입력 지연"만 재고, 실제 처리·렌더링 시간은 안 봤습니다.

## INP가 재는 것

INP는 **페이지 생애 동안의 모든 인터랙션**(클릭·탭·키 입력)을 관찰해, 그중 **가장 오래 걸린 것**(이상치 제외)을 대표값으로 보고합니다. 그리고 한 인터랙션의 전체 구간을 잽니다.

```
INP = 입력 지연 + 처리 시간(이벤트 핸들러) + 프레젠테이션 지연(다음 페인트까지)
```

즉 "탭했더니 화면이 실제로 바뀌기까지" 전 구간입니다. 훨씬 사용자 체감에 가깝습니다.

## 기준값

필드 데이터(실사용자)의 **75 퍼센타일** 기준:

| 등급       | INP                |
| ---------- | ------------------ |
| 좋음(Good) | **≤ 200ms**        |
| 개선 필요  | 200ms 초과 ~ 500ms |
| 나쁨(Poor) | **> 500ms**        |

## 어떻게 개선하나

INP를 잡는 핵심은 **메인 스레드에서 긴 작업을 끊어주는 것**입니다.

- **긴 태스크 쪼개기**: 이벤트 핸들러에서 무거운 동기 작업을 하지 말고, 급하지 않은 부분은 메인 스레드에 양보(yield)하세요. `scheduler.yield()`(Chrome 158에는 있음, 다른 브라우저는 지원 확인 필요)나 `setTimeout`으로 다음 태스크에 넘깁니다. `await Promise.resolve()`처럼 마이크로태스크로 넘기는 것은 양보가 아닙니다 — [이벤트 루프 글](/posts/event-loop-microtasks/)에서 재 보니 그 사이에 화면을 한 번도 그리지 못했습니다.
- **먼저 그리고 나중에 계산**: 클릭 시 UI를 즉시 업데이트해 시각적 반응부터 주고(프레젠테이션), 무거운 계산은 그 다음으로 미룹니다.
- **입력 디바운스/스로틀**: 특히 키를 칠 때마다 무거운 일을 하는 `input` 핸들러. (스크롤은 INP가 재는 상호작용이 아닙니다.)
- **렌더 비용 축소**: 큰 리스트 가상화, `content-visibility: auto`로 오프스크린 렌더 지연, 불필요한 리렌더 제거.
- **자바스크립트 총량 줄이기**: 하이드레이션·서드파티 스크립트가 메인 스레드를 오래 잡으면 INP가 나빠집니다.

## 직접 재 보기 — 300ms 핸들러를 쪼개면

버튼을 누르면 300ms짜리 동기 계산을 하고 "저장했습니다"를 표시하는 시험 페이지를 만들어, 핸들러 모양만 바꿔 가며 상호작용 시간을 쟀습니다. 값은 INP의 재료인 Event Timing API(`PerformanceObserver`, `type: 'event'`)에서 같은 상호작용에 속한 이벤트 중 가장 긴 `duration`입니다.

```js
const busy = (ms) => { const end = performance.now() + ms; while (performance.now() < end); };

// A) 한 번에 처리
button.addEventListener('click', () => {
  busy(300);
  out.textContent = '저장했습니다';
});

// B) 먼저 그리고 한 번 양보
button.addEventListener('click', async () => {
  out.textContent = '저장 중…';
  await scheduler.yield(); // setTimeout(…, 0) 으로 바꿔도 결과가 같았다
  busy(300);
  out.textContent = '저장했습니다';
});

// C) 먼저 그리고 30ms 씩 나눠 양보
button.addEventListener('click', async () => {
  out.textContent = '저장 중…';
  for (let i = 0; i < 10; i++) {
    await scheduler.yield();
    busy(30);
  }
  out.textContent = '저장했습니다';
});
```

Chrome 158(Playwright)에서 다섯 번씩 누른 결과입니다. "두 번째 클릭"은 첫 클릭 100ms 뒤에 한 번 더 눌렀을 때 그 두 번째 상호작용의 값입니다. Event Timing의 `duration`은 8ms 단위로 반올림되고, 측정 기준(`durationThreshold`)의 최솟값이 16ms라 "16ms 이하"는 그보다 짧다는 뜻입니다.

| 핸들러 | 한 번 누름 | 두 번째 클릭 |
| ------ | ---------: | -----------: |
| A      |  304~320ms |            — |
| B      |  16ms 이하 |    200~224ms |
| C      |  16ms 이하 |    16ms 이하 |

B만 봐도 한 번 누른 상호작용은 304ms → 16ms 이하로 줄어듭니다. "저장 중…"을 먼저 그린 뒤 무거운 일을 다음 태스크로 넘겼기 때문입니다. 하지만 **양보한 뒤의 300ms 덩어리는 그대로 남아 있어서**, 그 사이에 다시 누르면 두 번째 상호작용이 200ms 넘게 기다렸습니다. INP는 페이지에서 가장 느린 상호작용을 보므로 이 값이 잡힙니다. 덩어리를 30ms로 나눠 사이마다 양보한 C에서야 두 번째 클릭도 빨라졌습니다.

시험 페이지와 자동 클릭으로 잰 실험실 값이라 실제 사용자 INP와 같지는 않습니다. 실제 값은 아래 필드 도구로 봅니다.

## 측정 도구

- **필드(실사용자)**: Chrome UX Report(CrUX), PageSpeed Insights, `web-vitals` 자바스크립트 라이브러리로 실제 사용자 INP 수집
- **랩(진단)**: Lighthouse, DevTools Performance 패널에서 어떤 인터랙션이 길었는지 추적

> INP는 "첫인상"이 아니라 **"페이지를 쓰는 내내 얼마나 반응이 좋은가"**를 봅니다. 자바스크립트가 메인 스레드를 얼마나 오래 붙잡는지가 그대로 점수가 됩니다.
