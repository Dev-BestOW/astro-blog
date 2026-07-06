---
title: 'Signals — 프레임워크 반응성이 수렴하는 지점'
description: 'Solid, Preact, Angular, Vue, Svelte가 서로 다른 이름으로 같은 것을 향해 갑니다. Signals라는 반응성 원시 개념과, 이것이 왜 지금 이슈인지 정리합니다.'
tags: ['frontend', 'javascript']
---

최근 프론트엔드 프레임워크들이 약속이나 한 듯 **Signals**라는 개념으로 수렴하고 있습니다. 이름은 제각각이지만(runes, refs, signals) 핵심 아이디어는 같습니다. 6년차라면 특정 프레임워크가 아니라 **이 원시 개념 자체**를 이해해 두는 게 남는 장사입니다.

## Signal이란

세 가지 조각으로 이뤄진 반응성 모델입니다.

- **signal**: 값을 담는 반응형 상자 (읽기/쓰기)
- **computed**: 다른 signal에서 파생되는 값 (자동 갱신, 캐시됨)
- **effect**: signal이 바뀌면 자동 실행되는 부수효과

```js
// 개념적 의사코드 (프레임워크마다 문법은 다름)
const count = signal(0);
const doubled = computed(() => count.get() * 2);

effect(() => console.log('doubled:', doubled.get()));

count.set(1); // effect 자동 재실행 → "doubled: 2"
```

## 왜 "세밀한(fine-grained) 반응성"인가

핵심은 **의존성 추적**입니다. `computed`/`effect`가 실행될 때 어떤 signal을 읽었는지 런타임이 기록해 두고, 그 signal이 바뀔 때 **정확히 그것에 의존하는 계산만** 다시 돌립니다.

React의 기본 모델과 대비하면 차이가 분명합니다. React는 상태가 바뀌면 컴포넌트 함수를 **다시 실행**하고 가상 DOM을 비교(diff)합니다. Signals 계열은 컴포넌트를 통째로 재실행하지 않고 **바뀐 값에 연결된 최소 단위만** 갱신합니다. 그래서 "컴포넌트 트리 전체 dirty-check"가 없습니다.

## 이름만 다른 같은 개념

- **SolidJS**: `createSignal` — 이 모델을 가장 순수하게 구현
- **Preact Signals**: `signal`/`computed`/`effect` (React에서도 사용 가능한 별도 패키지)
- **Angular**: `signal()`·`computed()`·`effect()`를 v16부터 도입, 반응성의 중심축으로 이동 중
- **Vue**: `ref`/`reactive`/`computed`가 사실상 같은 계열(Vue 3의 반응성 시스템)
- **Svelte 5**: `$state`/`$derived` 등 "runes"로 재설계

React는 이 흐름에서 살짝 예외적입니다 — signals를 채택하는 대신, **React Compiler**로 재실행 비용을 자동 최적화하는 다른 길을 갑니다.

## 표준화 움직임

signals를 **자바스크립트 언어 표준**으로 만들려는 TC39 제안도 진행 중입니다. 프레임워크마다 제각각인 반응성 원시 개념을 공통 기반으로 통일하자는 취지입니다. 다만 아직 **초기 제안 단계**라 브라우저 내장까지는 시간이 필요하고, 지금은 각 프레임워크·라이브러리 구현으로 쓰는 단계입니다.

## 6년차의 관점

- 특정 프레임워크 문법보다 **"의존성 추적 기반 반응성"이라는 멘탈 모델**이 이식성 있는 자산입니다.
- 대규모 앱의 렌더 성능 문제를 진단할 때, "왜 이게 다시 렌더되지?"의 답이 프레임워크마다 다릅니다(재실행+메모이제이션 vs 세밀한 구독). 그 차이를 알면 최적화 전략이 명확해집니다.

> 프레임워크 전쟁의 표면 아래에서, 반응성의 "어떻게"는 조용히 하나로 모이는 중입니다. 이름이 아니라 원리를 익혀 두세요.
