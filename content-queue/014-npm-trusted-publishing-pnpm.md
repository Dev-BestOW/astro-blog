---
title: 'npm 토큰 없이 배포하기 — Trusted Publishing(OIDC)과 pnpm 11 함정'
description: 'GitHub Actions 에서 npm 에 배포할 때 NPM_TOKEN 을 저장소 비밀값에 넣지 않아도 됩니다. Trusted Publishing(OIDC)으로 바꾸며 여러 번 실패한 원인 — pnpm 10 은 지원하지 않음, "Direct publishing" 체크, 새 패키지의 첫 배포 순서 — 와 changesets 로 묶은 배포 흐름을 정리합니다.'
tags: ['npm', 'github-actions', 'devops']
series: 'BestOW UI 만들기'
draft: false
---

GitHub Actions 에서 npm 에 배포하려면 예전에는 npm 액세스 토큰을 만들어 저장소 비밀값(`NPM_TOKEN`)에 넣었습니다. 토큰은 유효 기간을 관리해야 하고, 새면 누구나 내 패키지를 배포할 수 있습니다.

**npm Trusted Publishing** 은 토큰 대신 OIDC 를 씁니다. "이 저장소의 이 워크플로가 배포해도 된다" 고 npm 에 미리 등록해 두면, Actions 실행이 받은 짧은 수명의 OIDC 토큰을 npm 이 확인하고 배포를 허락합니다. 저장할 비밀값이 없습니다.

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 의 패키지(`@bestow-ui/react`·`tokens`·`icons`·`korean-utils`)는 모두 이렇게 배포합니다. 바꾸는 과정에서 배포가 여러 번 실패했고, 이 글은 그 원인들입니다.

## 배포 흐름

[changesets](https://github.com/changesets/changesets) 로 버전을 관리합니다.

1. 기능을 바꿀 때 `.changeset/*.md` 에 "어느 패키지를 patch/minor/major 로" 를 적어 함께 커밋합니다.
2. main 에 들어가면 워크플로가 **버전 PR**("chore: version packages")을 만듭니다. 변경 기록(CHANGELOG)과 버전이 그 안에 있습니다.
3. 그 PR 을 머지하면 같은 워크플로가 npm 에 배포하고 git 태그·GitHub Release 를 만듭니다.

워크플로의 핵심은 권한입니다(실제 코드, 일부).

```yaml
permissions:
  contents: read # 쓰기 작업은 모두 App 토큰으로 한다
  id-token: write # npm Trusted Publishing (OIDC) + provenance

jobs:
  release:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/create-github-app-token@v3
        id: app-token
        with:
          client-id: ${{ vars.RELEASE_APP_CLIENT_ID }}
          private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup # pnpm + Node + install
      - name: Create release PR or publish
        uses: changesets/action@v2
        with:
          github-token: ${{ steps.app-token.outputs.token }}
          publish-script: pnpm release # pnpm build && changeset publish
```

`id-token: write` 가 OIDC 토큰을 받게 해 줍니다. `NPM_TOKEN` 은 어디에도 없습니다.

## 함정 1: pnpm 10 은 OIDC 로 배포하지 못한다

첫 시도는 실패했습니다. pnpm 10 의 `publish` 는 Trusted Publishing 의 OIDC 토큰 교환을 하지 못했습니다. pnpm 11 은 이 교환을 직접 처리합니다. 그래서 저장소를 pnpm 11 로 올렸습니다(`packageManager: pnpm@11.x`).

pnpm 11 로 올리며 따라온 변화도 있습니다.

- 설치 스크립트를 허용하는 설정이 `onlyBuiltDependencies` 에서 `allowBuilds` 로 바뀌었습니다.
- 기본으로 **올라온 지 24시간이 안 된 패키지 버전을 거부**합니다(공급망 공격 대비). 방금 나온 버전을 설치하려다 실패하면 대개 이 정책 때문입니다.

## 함정 2: "Direct publishing" 을 체크해야 한다

pnpm 11 로도 이런 오류가 났습니다.

```
E403 OIDC permission denied for this action
```

npm 의 Trusted Publisher 설정 화면에는 저장소(`Dev-BestOW` / `BestOW-UI`), 워크플로 파일(`release.yml`), Environment 를 적습니다. 저희가 설정을 만들었을 때(2026-10)는 새로 만든 설정이 기본으로 **stage publish 만 허용**했습니다. 바로 배포하려면 **"Direct publishing"** 을 체크해야 합니다.

그리고 이 설정은 **수정할 수 없습니다.** 지우고 다시 만들어야 합니다. 또 워크플로에서 GitHub Environment 를 쓰지 않는다면 설정의 Environment 칸도 비워 둬야 조건이 맞습니다.

## 함정 3: 새 패키지는 첫 버전을 손으로

Trusted Publisher 는 **npm 에 이미 있는 패키지**에만 설정할 수 있습니다. 그래서 새 패키지(예: 나중에 추가한 `korean-utils`)는 첫 버전을 로컬에서 `npm login` 후 직접 배포하고, 그다음에 Trusted Publisher 를 만듭니다.

**순서가 중요합니다.** 이 새 패키지를 의존하는 `react` 의 버전 PR 을 먼저 머지하면, 워크플로가 새 패키지를 OIDC 로 올리려다 실패하고 `react` 는 npm 에 없는 버전을 의존하게 됩니다. 새 패키지의 첫 배포 → Trusted Publisher 생성 → 그다음 버전 PR 머지 순서로 합니다.

## 함정 4: 기본 GITHUB_TOKEN 으로 만든 PR

버전 PR 을 기본 `GITHUB_TOKEN` 으로 만들면, 그 PR 의 CI 가 바로 돌지 않고 승인 대기로 멈췄습니다. GitHub 는 `GITHUB_TOKEN` 으로 만든 이벤트가 다른 워크플로를 연쇄로 실행하지 않게 막습니다. 그래서 버전 PR·커밋·태그는 별도로 만든 **GitHub App 의 토큰**으로 만듭니다(위 코드의 `create-github-app-token`). 시각 회귀 기준 이미지를 봇이 커밋할 때도 같은 이유로 App 토큰을 씁니다. 기본 토큰으로 push 한 기준 이미지 커밋이 버전 PR 을 다시 만들지 않아, PR 이 옛 기준 이미지로 실패한 적이 있습니다.

## 실패했을 때

GitHub Actions 의 단계별 로그는 로그인해야 볼 수 있습니다. 배포가 실패하면 추측으로 고치지 말고 **"Create release PR or publish" 단계 로그**부터 봅니다. 위의 E403 처럼 원인이 그대로 적혀 있는 경우가 많습니다.

## 정리

- `id-token: write` + npm Trusted Publisher 등록이면 **저장할 npm 토큰이 없습니다.**
- pnpm 은 **11 이상**이어야 OIDC 로 배포합니다. 24시간 미만 버전 거부 정책도 함께 알아 둡니다.
- Trusted Publisher 설정에서 **Direct publishing** 을 체크합니다. 설정은 수정이 안 되니 지우고 다시 만듭니다.
- 새 패키지는 첫 버전을 직접 배포한 뒤 설정하고, 그것을 의존하는 패키지보다 **먼저** 올립니다.
- 버전 PR 은 GitHub App 토큰으로 만들어야 CI 가 돕니다.
