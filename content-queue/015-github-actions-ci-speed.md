---
title: 'CI 속도 개선 — GitHub Actions 7분을 4분으로 줄인 기록'
description: '로그로 병목을 재고 job 분리·Playwright 이미지·샤딩을 적용했습니다. 효과가 없던 시도와 숨김 폴더 함정도 정리합니다.'
tags: ['github-actions', 'testing', 'devops']
series: 'BestOW UI 만들기'
draft: false
---

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 는 혼자 개발하면서 main 에 바로 push 해 왔습니다. 그러다 브랜치 흐름을 GitHub Flow(짧은 작업 브랜치 → PR → squash merge)로 바꾸고, main 에는 **PR 과 필수 검사 통과 없이는 들어갈 수 없게** GitHub ruleset 을 걸었습니다.

그러자 CI 시간이 곧 기다리는 시간이 됐습니다. PR 하나를 머지하려면 7분쯤 기다려야 했습니다. 이 글은 그 시간을 줄인 과정입니다. 숫자는 모두 GitHub Actions 실행 로그에서 읽은 값이고, 효과가 없었던 시도와 잘못 짚은 원인도 함께 적습니다.

## 먼저 잰 것: 어디서 시간이 드는가

추측으로 고치지 않으려고 최근 성공한 실행 3회의 job·단계별 시간을 GitHub API 로 뽑았습니다.

```bash
gh api repos/<owner>/<repo>/actions/runs/<run id>/jobs \
  --jq '.jobs[] | "\(.name): \(((.completed_at|fromdate)-(.started_at|fromdate)))s"'
```

| job                      | 3회 시간          | 무엇을 하나                                                                  |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------- |
| Typecheck · Test · Build | 6.6 · 6.1 · 7.6분 | lint → 타입 검사 → 단위 테스트 → Chromium 스토리 테스트 → E2E 를 **한 줄로** |
| Cross-browser (webkit)   | 6.5 · 5.8 · 6.0분 | 스토리 테스트 다음에 E2E                                                     |
| Cross-browser (firefox)  | 6.4 · 6.3 · 6.6분 | 같음                                                                         |
| React 18                 | 1.5 · 1.6 · 1.6분 | React 18 로 타입 검사·단위 테스트                                            |

job 들은 이미 나란히 돌고 있었으니, 가장 긴 job 이 곧 전체 시간입니다. 단계별로 보면 두 가지가 눈에 띄었습니다.

- **한 job 이 일을 차례로 너무 많이 합니다.** WebKit job 은 스토리 테스트(135초)가 끝나야 E2E(147초)를 시작합니다.
- **브라우저 설치가 깁니다.** `playwright install --with-deps firefox` 한 단계가 136초였습니다. Chromium 은 35초, WebKit 은 54초였습니다.

## 1. 한 줄로 돌던 일을 job 으로 나누기

서로 기다릴 필요가 없는 일을 job 으로 쪼갰습니다.

- `check`: lint·서식·빌드·번들 크기·타입 검사·단위 테스트
- `stories`: 브라우저 3종 matrix — 스토리 렌더링·접근성(axe) 검사
- `e2e`: 브라우저 3종 matrix — Next.js 예제 앱을 빌드해 E2E
- `react18`: 그대로

job 마다 의존성 설치·패키지 빌드를 따로 하니 전체 실행 시간(분)의 합은 늘어납니다. 공개 저장소는 Actions 시간이 무료라 기다리는 시간을 줄이는 쪽을 택했습니다.

## 2. 브라우저 설치를 없애기 — Playwright 공식 이미지

브라우저 job 은 Playwright 공식 Docker 이미지 안에서 돌게 했습니다. 이미지에 브라우저와 OS 의존성이 이미 들어 있어 설치 단계가 필요 없습니다. 시각 회귀 테스트는 원래 이 이미지에서 돌고 있었습니다(글꼴 렌더링을 고정하려고). 실제 설정 일부입니다.

```yaml
stories:
  name: Stories (${{ matrix.browser }})
  runs-on: ubuntu-24.04
  container:
    image: mcr.microsoft.com/playwright:v1.64.1-noble
    options: --user 1001
  strategy:
    fail-fast: false
    matrix:
      browser: [chromium, webkit, firefox]
```

- `--user 1001` 은 [Playwright CI 문서](https://playwright.dev/docs/ci#via-containers)의 GitHub Actions 컨테이너 예시를 그대로 따른 것입니다.
- 이미지 태그는 저장소의 `playwright`·`@playwright/test` 버전과 **반드시 같아야** 합니다. 버전을 올릴 때 함께 올릴 곳이 하나 늘었습니다.
- job 이름은 ruleset 의 필수 검사 이름이기도 합니다. 이름이 바뀌면 GitHub 는 이제 없는 옛 이름의 검사를 계속 기다립니다. 이 PR 에서도 실제 검사는 11개인데 화면에는 13개가 떠 있었고, 남은 둘이 옛 job 이름이었습니다. ruleset 을 새 이름으로 고친 뒤에야 머지할 수 있었습니다.

결과: CI 전체가 **약 7분에서 4.3분**으로 줄었습니다. 가장 긴 job 은 WebKit E2E(3.9분)였습니다.

## 3. 효과가 없던 것과 잘못 짚은 원인

같은 PR 에서 시각 회귀 테스트의 Playwright `workers` 를 2 에서 4 로 늘렸습니다. 로그에 `Running 654 tests using 2 workers` 라고 찍혀 있었기 때문입니다.

| workers | 스크린샷 654장 비교 |
| ------- | ------------------- |
| 2       | 3.7 · 3.7 · 3.7분   |
| 4       | 3.4분               |

거의 그대로였습니다. worker 수 × 걸린 시간 ÷ 테스트 수로 테스트 한 개에 든 시간을 계산하면 **약 0.68초에서 약 1.25초**로 늘었습니다. 동시에 두 배를 돌렸더니 하나하나가 두 배 가까이 느려진 것입니다. 기계 한 대의 CPU 가 이미 가득 차 있다는 뜻이라, 같은 기계에서 worker 를 늘려서는 줄일 수 없습니다.

잘못 짚은 원인도 있었습니다. 컨테이너로 옮긴 뒤 Firefox 스토리 테스트가 184초가 나와, 처음에는 "Docker 의 작은 공유 메모리 때문에 느려졌다" 고 보고 `--ipc=host` 를 넣자고 했습니다. 그런데 이전 실행 로그의 vitest `Duration` 을 보니 원래 값이 **115 · 182 · 115초**였습니다. 컨테이너 이전에도 182초가 나온 적이 있으니 컨테이너 탓이라는 근거는 없습니다. 이 제안은 버렸습니다.

이 일 뒤로 두 가지를 규칙으로 정했습니다.

- 한 번 잰 값으로 결론 내지 않습니다. 바꾸기 전 실행 여러 번의 **편차를 먼저** 봅니다.
- 바꾼 뒤에도 3회 이상 재고(PR 에서 "Re-run all jobs"), 차이가 편차보다 클 때만 남깁니다.

## 4. 시각 회귀를 기계 2대로 나누기(샤딩)

CPU 가 한계라면 기계를 늘리면 됩니다. Playwright 는 `--shard=1/2` 처럼 테스트를 나눠 여러 기계에서 돌리는 기능이 있습니다([샤딩 문서](https://playwright.dev/docs/test-sharding)). 로컬에서 먼저 나뉘는 수를 확인했습니다.

```bash
npx playwright test -c visual/playwright.config.ts --list --shard=1/2   # 327 tests
npx playwright test -c visual/playwright.config.ts --list --shard=2/2   # 327 tests
npx playwright test -c visual/playwright.config.ts --list               # 654 tests
```

까다로운 것은 비교가 아니라 **커밋**이었습니다. 이 워크플로는 새 스토리의 기준 이미지가 없으면 찍어서 봇이 main 에 커밋하고, 수동 실행(update)이면 기준 이미지를 모두 새로 찍어 커밋합니다. 기계 두 대가 각자 커밋하면 서로 부딪힙니다. 그래서 구조를 이렇게 바꿨습니다.

- `Screenshots (1/2)`, `Screenshots (2/2)`: 반씩 비교합니다. 커밋해야 하는 실행이면 찍은 이미지를 artifact 로 올립니다.
- `Storybook screenshots`: 두 shard 가 끝나면 artifact 를 모아 **한 번에** 커밋합니다. shard 가 하나라도 실패하면 커밋하지 않습니다. 이름이 기존 필수 검사와 같아 ruleset 은 고치지 않아도 됐습니다.

PR 에서 3회 쟀습니다.

|                            | 1대(이전)               | 2대               |
| -------------------------- | ----------------------- | ----------------- |
| 비교 단계(느린 shard 기준) | 3.7 · 3.7 · 3.7 · 3.4분 | 2.2 · 2.1 · 2.1분 |
| 시각 회귀 실행 전체        | 278 · 298 · 296 · 289초 | 208 · 222 · 211초 |

두 범위가 겹치지 않아 남기기로 했습니다. 절반까지 줄지 않는 이유도 로그에 보입니다. 컨테이너 시작·의존성 설치·Storybook 빌드에 기계마다 1분쯤이 똑같이 듭니다.

첫 실행에서는 두 shard 가 1.5분·2.2분으로 차이가 커서 "다크 테마 스크린샷이 뒤쪽 shard 에 몰렸나" 싶었습니다. 하지만 3회차는 2.1분·1.8분으로 앞쪽이 더 느렸습니다. 이것도 편차였습니다.

## 5. 숨김 폴더 함정: 기준 이미지 654장이 지워졌다

비교는 PR 에서 확인할 수 있지만, 커밋 경로는 PR 에서 돌지 않습니다. 그래서 머지 전에 작업 브랜치를 골라 update 를 직접 실행했습니다. 화면이 같으니 "커밋할 것 없음" 으로 끝나야 정상입니다.

그런데 봇이 브랜치에 **기준 이미지 654장을 모두 지운 커밋**을 push 했습니다. 로그를 차례로 보니 원인이 그대로 남아 있었습니다.

```text
올릴 기준 이미지 327개
  include-hidden-files: false
No files were found with the provided path: .visual-baselines. No artifacts will be uploaded.
…
Found 0 artifact(s)
```

모은 폴더 이름을 `.visual-baselines` 로 지었는데, `actions/upload-artifact` 는 점으로 시작하는 파일·폴더를 숨김으로 보고 건너뜁니다(`include-hidden-files` 기본값 false, [README](https://github.com/actions/upload-artifact#including-hidden-files)). 이미지는 327장씩 모였지만 하나도 올라가지 않았습니다. 마지막 job 은 update 라서 기준 이미지 폴더를 비운 뒤 받은 것(0장)으로 채웠고, 그 결과를 그대로 커밋했습니다.

세 가지를 고쳤습니다(실제 설정, 일부).

```yaml
- uses: actions/upload-artifact@v7
  with:
    name: visual-baselines-${{ matrix.shard }}
    path: visual-baselines # 점으로 시작하지 않는 이름
    if-no-files-found: ${{ inputs.update && 'error' || 'ignore' }}
```

```bash
# 마지막 job — update 인데 받은 이미지가 없거나 커밋돼 있던 수의 절반도 안 되면 커밋하지 않는다
count=$(find apps/storybook/visual/__screenshots__/linux -type f 2>/dev/null | wc -l)
before=$(git ls-files apps/storybook/visual/__screenshots__/linux | wc -l)
if [ "$count" -eq 0 ] || [ "$count" -lt $((before / 2)) ]; then
  echo "::error::받은 기준 이미지가 너무 적습니다(${count}/${before}) — 커밋하지 않습니다."
  exit 1
fi
```

1. 폴더 이름에서 점을 뺐습니다.
2. update 에서는 올릴 파일이 없으면 shard 가 실패합니다. 새 스토리가 없는 평소 비교는 파일이 없는 게 정상이라 그대로 둡니다.
3. 마지막 job 이 받은 수를 확인하고, 너무 적으면 커밋하지 않습니다.

지워진 이미지는 그 커밋을 `git revert` 해서 되살렸습니다. 다시 실행하자 로그는 `Found 2 artifact(s)`, `받은 기준 이미지 654개 (커밋돼 있던 것 654개)` 로 끝났습니다. main 이 아니라 작업 브랜치에서 먼저 돌려 본 덕분에 main 은 아무 영향이 없었습니다.

## 정리

|           | 처음     | 지금     |
| --------- | -------- | -------- |
| CI        | 약 7분   | 약 4.3분 |
| 시각 회귀 | 약 4.8분 | 약 3.6분 |

- **가장 큰 효과는 구조에서 나왔습니다.** 한 job 에 차례로 쌓인 일을 나누고, 브라우저 설치를 이미지로 없앴습니다.
- **같은 기계에서 병렬 수를 늘리는 것은 CPU 가 남을 때만 통합니다.** 테스트 한 개에 든 시간을 계산해 보면 바로 보입니다.
- **원인은 이전 실행과 비교해 확인합니다.** 한 번 느린 값은 원래 편차일 수 있습니다.
- **평소에 돌지 않는 경로(봇 커밋·update)는 머지 전에 브랜치에서 직접 돌려 봅니다.** 이번 버그는 PR 검사가 모두 통과한 상태에서 나왔습니다.

남은 긴 job 은 Firefox 스토리 테스트(3~~3.5분)와 브라우저별 E2E(2.5~~3.5분)입니다. 이 둘도 바꾸기 전에 편차부터 재 볼 생각입니다.
