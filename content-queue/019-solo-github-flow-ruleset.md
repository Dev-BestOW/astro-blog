---
title: '1인 개발 GitHub Flow — ruleset 으로 main 지키기'
description: 'git-flow 대신 PR·squash·CI 통과를 강제했습니다. 워크플로 push 권한과 job 이름이 바뀔 때의 함정도 정리합니다.'
tags: ['github', 'git', 'devops']
series: 'BestOW UI 만들기'
draft: false
---

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 는 혼자 만들고 있습니다. 그래서 지금까지는 브랜치 없이 main 에 바로 push 했습니다. 리뷰할 사람도 없는데 PR 을 만드는 건 번거로운 절차처럼 느껴졌기 때문입니다.

그런데 저장소를 다시 보니 혼자라서 생기는 문제가 있었습니다. 이 글은 브랜치 흐름을 정하고 GitHub ruleset 으로 main 을 지키게 한 과정입니다.

## 바로 push 할 때의 문제

- **CI 가 push 한 뒤에야 돕니다.** 그런데 문서 사이트 배포 워크플로는 패키지·앱이 바뀐 push 가 main 에 들어오면 바로 돕니다. 테스트가 깨진 커밋이 사이트에 먼저 올라갈 수 있습니다.
- **PR 을 전제로 만든 자동화가 놀고 있었습니다.** 번들 크기를 base 와 비교해 PR 코멘트로 남기는 워크플로, 시각 회귀 기준 이미지를 "그 브랜치에" 갱신하는 워크플로가 있는데, PR 이 버전 PR 뿐이라 거의 쓰이지 않았습니다.
- **main 보호 규칙은 삭제·force push 금지뿐**이었습니다.

## git-flow 가 아니라 GitHub Flow

브랜치 전략이라고 하면 develop·release·hotfix 브랜치를 두는 git-flow 가 먼저 떠오릅니다. 하지만 이 저장소에는 맞지 않았습니다.

- **배포 시점은 이미 changesets 가 정합니다.** main 에 변경 기록(changeset)이 쌓이면 봇이 "version packages" PR 을 만들고, 격주 목요일에 그 PR 을 머지하면 npm 에 배포됩니다. release 브랜치가 하던 일을 버전 PR 이 하고 있습니다.
- npm 사용자는 버전 번호로 받습니다. main 이 "지금 배포된 코드" 와 같을 필요가 없습니다.
- 혼자 쓰는 저장소에서 오래 사는 브랜치는 병합 비용만 늘립니다.

그래서 **GitHub Flow** 로 정했습니다. main 하나만 오래 살고, 작업마다 짧은 브랜치(`feat/…`·`fix/…`·`docs/…`·`ci/…`)를 만들어 PR 로 합칩니다.

## main ruleset

GitHub 의 ruleset 으로 규칙을 걸었습니다. 설정 화면에서 클릭으로 만들 수도 있지만, 나중에 무엇을 왜 바꿨는지 남도록 JSON 파일로 저장소에 두고 스크립트로 적용합니다(실제 파일, 일부).

```json
{
  "name": "main 보호",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [
    { "actor_type": "RepositoryRole", "actor_id": 5, "bypass_mode": "always" },
    { "actor_type": "Integration", "actor_id": "RELEASE_APP_ID", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": { "required_approving_review_count": 0, "allowed_merge_methods": ["squash"] } },
    { "type": "required_status_checks", "parameters": { "required_status_checks": [
      { "context": "Typecheck · Test · Build", "integration_id": 15368 },
      { "context": "Storybook screenshots", "integration_id": 15368 }
    ] } }
  ]
}
```

- **리뷰 승인 수는 0** 입니다. 혼자라 승인해 줄 사람이 없습니다. 목적은 리뷰가 아니라 "CI 를 통과한 것만 main 에 들어간다" 입니다.
- **필수 검사**는 CI job 이름입니다. 지금은 9개(위에는 2개만 적음)입니다.
- **우회 목록**에는 관리자(`RepositoryRole` 5)와 배포 봇이 쓰는 GitHub App 만 넣었습니다. 시각 회귀 워크플로가 새 스토리의 기준 이미지를 main 에 바로 커밋하기 때문에, 봇이 빠지면 그 커밋이 막힙니다. 관리자 우회는 ROADMAP 같은 내부 문서만 고칠 때 씁니다.

`actor_id` 에 들어갈 App ID 는 저장소에 적지 않고 스크립트 인자로 받습니다. 스크립트는 저장소 병합 설정도 함께 바꿉니다.

```bash
# squash 만 허용, 제목은 PR 제목·본문은 커밋 메시지, 머지된 브랜치 자동 삭제, auto-merge 허용
gh api -X PATCH "repos/$repo" \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=COMMIT_MESSAGES \
  -F delete_branch_on_merge=true -F allow_auto_merge=true >/dev/null
```

## squash merge 와 PR 제목

커밋 메시지는 [gitmoji](https://gitmoji.dev/) + 한국어 한 줄로 써 왔습니다(`✨ AmountInput 에 빠른 금액 버튼 추가` 처럼). squash merge 만 허용하고 커밋 제목을 **PR 제목**으로 정하면, PR 제목만 그렇게 쓰면 main 의 기록이 지금과 같은 모양으로 남습니다. PR 템플릿 맨 위에 이 안내를 적어 두었습니다.

본문은 PR 설명이 아니라 커밋 메시지로 정했습니다. PR 설명에는 템플릿의 체크리스트가 들어 있어서, 그대로 쓰면 main 기록에 체크박스가 쌓입니다.

CI 를 기다리는 시간은 auto-merge 로 줄였습니다.

```bash
git push -u origin HEAD && gh pr create --fill && gh pr merge --auto --squash
```

PR 을 열면서 자동 머지를 걸어 두면, 필수 검사가 모두 통과하는 순간 알아서 머지됩니다.

## 걸린 함정 두 가지

**1. 워크플로 파일을 고친 push 가 거절된다.** CI 설정(`.github/workflows/*.yml`)을 고친 브랜치를 push 하자 실패했습니다. GitHub 는 워크플로 파일을 바꾸는 push 에 `workflow` 권한이 있는 토큰을 요구하는데, 제 gh 토큰 권한은 `gist`·`read:org`·`repo` 뿐이었습니다. 그동안은 워크플로 파일을 고친 적이 없어서 몰랐습니다.

```bash
gh auth refresh -h github.com -s workflow   # 권한 추가
gh auth setup-git                           # git push 가 gh 토큰을 쓰게 연결
```

**2. CI job 이름을 바꾸면 PR 이 영원히 기다린다.** 다음 PR 에서 CI 를 브라우저별 job 으로 나누면서([CI 속도 개선 글](/posts/github-actions-ci-speed/)) job 이름이 바뀌었습니다. PR 화면에는 검사가 13개 떠 있었는데, 실제로 도는 것은 11개였습니다. 남은 2개는 ruleset 이 여전히 요구하는 **옛 job 이름**이었고, 그 job 은 이제 없으니 끝나지 않습니다. ruleset 의 필수 검사 이름을 새 이름으로 고치고 스크립트를 다시 돌린 뒤에야 머지할 수 있었습니다. 그래서 워크플로 파일 job 이름 옆에 "이 이름은 필수 검사다" 라는 주석을 달아 두었습니다.

## PR 로 바꾸고 나서 달라진 것

규칙을 건 다음 PR 에서 바로 효과가 있었습니다. 시각 회귀 테스트를 기계 두 대로 나누는 PR 이었는데, 검사는 모두 통과했지만 머지 전에 브랜치에서 "기준 이미지 갱신" 워크플로를 직접 돌려 봤습니다. 평소 PR 에서는 돌지 않는 경로였기 때문입니다. 그 실행에서 봇이 **기준 이미지 654장을 모두 지운 커밋**을 만들었습니다(artifact 폴더 이름이 점으로 시작해 업로드가 건너뛰어진 버그). 브랜치였기 때문에 그 커밋을 되돌리고 고친 뒤 머지했고, main 에는 아무 영향이 없었습니다. 바로 push 하던 때였다면 main 에서 터졌을 일입니다.

## 정리

- 혼자 개발해도 **main 에 들어가는 길을 PR 하나로 좁히면** CI 를 통과한 것만 배포됩니다. 리뷰 승인은 0 이어도 됩니다.
- 배포 시점을 따로 관리하는 도구(changesets)가 있으면 git-flow 의 release 브랜치는 필요 없습니다.
- ruleset 은 JSON 파일 + 적용 스크립트로 저장소에 두면, 무엇을 왜 바꿨는지 기록이 남습니다.
- 필수 검사는 job **이름**으로 걸립니다. 이름을 바꾸면 ruleset 도 함께 고칩니다.
