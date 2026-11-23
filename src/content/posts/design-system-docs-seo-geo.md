---
pubDate: 2026-11-18
updatedDate: 2026-11-23
title: 'Storybook 문서가 검색에 안 잡힐 때 — 디자인 시스템 SEO'
description: 'Storybook 만으로는 검색에 빈 쪽으로 보였습니다. 정적 문서 쪽·JSON-LD·네이버 제목 길이·llms.txt 로 고친 하루.'
tags: ['seo', 'geo', 'react', 'documentation']
series: 'BestOW UI 만들기'
draft: false
---

React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 를 공개하고 열흘쯤 지나 검색해 보니, "React 전화번호 입력 컴포넌트" 같은 검색어로는 어디에도 나오지 않았습니다. 컴포넌트 문서는 모두 Storybook 에 있었는데, 검색 엔진이 본 Storybook 은 생각과 많이 달랐습니다.

이 글은 그 뒤에 한 일을 정리한 기록입니다. 검색 엔진(SEO)과 ChatGPT·Perplexity·Cursor 같은 AI 답변(GEO, Generative Engine Optimization) 양쪽에서 문서를 찾게 하는 것이 목표였습니다. 효과는 아직 재는 중이라, 여기에는 **한 일과 걸린 함정**만 적습니다.

## 검색 엔진이 본 Storybook

Storybook 문서 주소는 `/storybook/?path=/docs/korean-kit-phonenumberinput--docs` 처럼 쿼리로 나뉩니다. 그런데 서버가 돌려주는 HTML 은 어느 주소든 같습니다.

- 모든 문서의 `<title>` 이 같고, canonical 도 모두 `/storybook/` 하나입니다.
- 내용은 JavaScript 로 그려서, HTML 에 들어 있는 글자는 약 3 kB 뿐입니다.

검색 엔진 입장에서는 "같은 제목의 거의 빈 쪽" 이 하나 있을 뿐이고, 컴포넌트마다 다른 문서가 있다는 것을 알 방법이 없습니다. Storybook 을 서버 렌더링하도록 고치는 길도 있지만 손이 크게 갑니다. 대신 **검색어가 분명한 컴포넌트만 골라 정적 HTML 문서 쪽을 따로 만들고**, Storybook 은 "직접 조작해 보기" 용도로 남겼습니다.

나중에 Search Console 에서 한 가지를 더 알게 됐습니다(11월 23일 추가). 11월 17일 크롤링에서 Storybook 주소 3개가 "사용자가 선택한 표준이 없는 중복 페이지" 로 잡혔는데, 모두 스토리 단독 화면 `/storybook/iframe.html` 에 쿼리가 붙은 주소였습니다. Storybook 은 문서 화면 안에 스토리를 이 `iframe.html` 로 끼워 그리는데, 이 주소도 따로 열 수 있는 쪽이라 검색 엔진이 찾아간 것입니다. 그래서 `.storybook/preview-head.html` 에 한 줄을 넣었습니다.

```html
<meta name="robots" content="noindex, indexifembedded" />
```

`noindex` 는 그 주소를 검색 결과에서 빼고, `indexifembedded` 는 다른 쪽(`/storybook/`) 안에 끼워진 내용은 그 쪽의 일부로 색인해도 된다는 뜻입니다. 구글 문서에 따르면 `indexifembedded` 는 `noindex` 와 함께 쓸 때만 효과가 있습니다. 배포 스크립트가 배포 폴더의 `iframe.html` 에 이 태그가 있는지 확인합니다.

## 1. 소스에서 읽어 만드는 정적 문서 쪽

소개 사이트(Next.js 정적 export)에 한국 서비스 입력 컴포넌트 13개의 문서 쪽 [`/components/<slug>/`](https://bestow-ui.com/components/) 을 만들었습니다. 62개 전부가 아니라 13개만 고른 이유는 검색어가 분명하고 경쟁이 적어서입니다. "전화번호 입력 컴포넌트" 는 찾는 사람이 있지만 "Divider 컴포넌트" 를 한국어로 찾는 사람은 드뭅니다.

쪽마다 내용을 두 종류로 나눴습니다.

| 내용                                               | 어디서 오나                          |
| -------------------------------------------------- | ------------------------------------ |
| 무엇이 어려운가요, 코드 예시, 알아 둘 점           | 쪽마다 직접 쓴 데이터 파일(`kit.ts`) |
| props 타입 정의, 키보드·스크린리더 동작, 언제 쓰나 | **빌드할 때 소스에서 읽어 옴**       |

props 는 컴포넌트 소스의 `interface` 를 JSDoc 째 코드 블록으로 보여 줍니다. 표로 예쁘게 그리려고 TypeScript 파서를 들이지 않았습니다. 키보드·스크린리더 동작은 접근성 문서가 쓰는 데이터 파일에서 가져옵니다. 이렇게 하면 문서를 따로 고치지 않아도 코드와 어긋나지 않습니다.

중요한 것은 **못 찾으면 빌드가 실패하게** 한 것입니다. 컴포넌트 이름이 바뀌어 props 를 찾지 못했는데 빈 코드 블록이 조용히 배포되면, 검색 엔진에는 내용 없는 쪽이 올라갑니다.

```ts
// 빌드 때 서버 컴포넌트에서 부른다(줄인 코드)
export function componentProps(name: string): string {
  const main = join(repoRoot(), 'packages/react/src/components', name, `${name}.tsx`);
  if (!existsSync(main)) throw new Error(`${name}: 소스 파일이 없어요 (${main})`);
  const types = publicTypes(readFileSync(main, 'utf8')); // export 한 interface·type 만, JSDoc 째
  if (!types.includes(`export interface ${name}Props`)) {
    throw new Error(`${name}: ${main} 에 export interface ${name}Props 가 없어요`);
  }
  return types;
}
```

접근성 데이터에는 `'PhoneNumberInput · BusinessNumberInput · AmountInput'` 처럼 여러 이름이 한 항목에 묶인 것이 있어서, `' · '` 로 나눈 뒤 이름이 **정확히 같은지** 봅니다. 문자열에 들어 있는지(`includes`)로 찾으면 `DatePicker` 가 `DateRangePicker` 항목에 걸립니다. 이 두 경우는 단위 테스트로 고정했습니다.

데모도 정적 쪽에 넣었습니다. 여기서도 함정이 둘 있었습니다.

- **"오늘" 이 들어가는 달력**: 오늘 날짜를 그대로 쓰면 빌드한 날과 보는 날이 달라 hydration 경고가 납니다. 데모는 `today` 를 고정합니다.
- **카카오 우편번호 주소 검색**: 데모가 외부 스크립트를 불러오면 네트워크·E2E 가 불안정해집니다. 스토리에서 쓰던 가짜 공급자를 넣습니다.

함수 문서(`/korean-utils/`)는 이미 같은 틀로 있었기 때문에, 목록 쪽·머리글·sitemap·이동 경로를 이어 서로 오갈 수 있게 했습니다. 함수 쪽의 "PhoneNumberInput 문서 보기" 도 Storybook 이 아니라 사이트 쪽으로 보냅니다. 링크가 **검색 엔진이 읽을 수 있는 쪽으로 모여야** 하기 때문입니다.

## 2. JSON-LD 와 리치 결과 테스트

쪽마다 구조화 데이터(JSON-LD)를 넣었습니다.

- 첫 화면: `WebSite`(사이트 이름) + `SoftwareSourceCode`(저장소·라이선스·언어)
- 문서 쪽: `TechArticle` + `BreadcrumbList`

`WebSite` 는 나중에(11월 20일) 더했습니다. 구글은 검색 결과에 보이는 사이트 이름을 첫 화면 `WebSite` 의 `name` 으로 정합니다.

이동 경로는 화면의 Breadcrumb 컴포넌트와 JSON-LD 를 **같은 배열 하나에서** 만듭니다. 따로 적으면 언젠가 둘이 어긋납니다.

JSON-LD 는 `<script>` 안에 넣는 JSON 이라, 데이터 글자에 `</script>` 가 있으면 거기서 스크립트가 끊깁니다. `<` 를 `\u003c` 로 바꿔 넣습니다. JSON 문자열 안에서는 같은 글자라 `JSON.parse` 결과는 같습니다.

```ts
export function serializeJsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```

Google 리치 결과 테스트에서는 세 가지를 배웠습니다.

1. **첫 결과가 "리치 결과 없음" 이었는데, 배포보다 1분 먼저 크롤링한 것**이었습니다. 크롤링 시각(13:47:36)과 배포 완료 시각(13:48:49)을 비교해 보고 알았습니다. 테스트는 배포가 끝난 것을 확인하고 돌립니다.
2. **`SoftwareSourceCode` 는 리치 결과 종류가 아닙니다.** 첫 화면은 다시 해도 "없음" 이 정상입니다. 검색 엔진과 AI 가 읽게 하려고 넣은 것이고, 확인은 Schema Markup Validator 로 합니다.
3. 문서 쪽은 Breadcrumbs 와 Articles 가 잡혔는데, Articles 에 "심각하지 않은 문제" 가 붙었습니다. Google 문서를 보면 Article 은 필수 속성이 없고 `headline`·`image`·`author`·`datePublished`·`dateModified` 가 권장입니다. 빠져 있던 `image`·`author`·`datePublished`·`dateModified` 넷을 넣자 경고가 사라졌습니다.

날짜는 빌드 때 git 기록에서 읽으려 했지만, 배포 워크플로의 checkout 이 기록을 한 개만 받아(`fetch-depth` 기본값) 쓸 수 없었습니다. 나중에 변경 기록 쪽을 만들며 `fetch-depth: 0` 으로 전체 기록을 받게 바꿨지만, 문서 날짜는 그대로 두었습니다. 한국 키트 13쪽의 글은 `kit.ts` 하나에, 함수 문서의 글은 `guides.ts` 하나에 있어서, git 으로는 파일을 고친 날만 알고 어느 쪽을 고쳤는지는 모르기 때문입니다. 그래서 데이터 파일에 "처음 낸 날·마지막으로 고친 날" 상수를 두고, 글을 고치면 그날로 바꾸는 규칙으로 했습니다. 손으로 바꾸는 값이라 잊을 수 있다는 점은 남아 있습니다.

## 3. 네이버는 제목 40자, 설명 80자

네이버 서치어드바이저의 URL 검사에서 첫 화면 제목·설명·OG 제목에 경고가 떴습니다. "40자 이내로 제목을", "80자 이내로 설명을" 이라는 권장입니다. 다른 쪽도 세어 보니 **29쪽 중 26쪽**이 넘고 있었습니다. 검색어를 넣으려고 제목을 길게 쓴 탓입니다.

화면의 h1 과 머리말은 길어도 괜찮으니 그대로 두고, 검색 결과에 보이는 메타만 줄였습니다.

- 제목 뒤의 " — BestOW UI" 는 **40자 안에 들어갈 때만** 붙입니다.
- 머리말이 긴 쪽은 검색용 설명(`metaDescription`)을 따로 둡니다. 이때 머리말에 없는 내용을 넣지 않도록 하나씩 대조했습니다.

```ts
export function pageTitle(title: string) {
  const withSite = `${title} — BestOW UI`;
  return withSite.length <= 40 ? withSite : title;
}
```

그리고 sitemap 의 모든 쪽을 열어 제목·설명·OG 길이를 재는 E2E 를 붙였습니다. 이런 규칙은 한 번 맞춰도 다음 쪽을 만들 때 다시 깨집니다. 사이트 이름을 항상 붙이도록 일부러 고쳐 보면 테스트가 바로 실패하는 것까지 확인했습니다.

Search Console 에서는 "리디렉션이 포함된 페이지" 알림도 받았습니다. 내려받아 보니 `http://bestow-ui.com/` 한 건, HTTPS 로 넘어가는 의도된 넘겨주기였습니다. sitemap 의 주소 32개와 사이트 안 링크 24개를 모두 열어 200 인 것을 확인하고 그대로 두었습니다.

## 4. 비교 쪽 — AI 가 가장 잘 인용하는 형식

"한국 서비스용 React UI 라이브러리 추천해 줘" 같은 질문에 AI 는 비교 표를 즐겨 인용합니다. [비교 쪽](https://bestow-ui.com/compare/) 을 만들며 세 가지를 지켰습니다.

- **칸마다 근거 링크**: 다른 라이브러리 칸은 그 라이브러리의 공식 문서·README·npm 에서 확인한 것만 적고 링크를 답니다.
- **확인한 날짜와 "찾지 못함" 의 뜻**: "찾지 못함" 은 없다는 뜻이 아니라 문서에서 못 찾았다는 뜻이라고 밝힙니다.
- **다른 선택지 안내**: 공공 웹사이트라 KRDS 를 따라야 하면 HANUI 가 맞다고 적습니다.

쪽을 만들며 2주 전에 쓴 README 비교 표를 다시 확인했더니, 그 사이 MUI 가 WCAG 2.2 A·AA 대응 보고서(초안, 일부 컴포넌트, 자체 평가)를 공개했고, 팔레트의 `contrastThreshold` 로 글자색을 대비에 맞춰 고르는 기능도 있었습니다. "—" 와 "직접 확인" 으로 적어 둔 칸이 틀린 셈이라 README 도 함께 고쳤습니다. 비교 표는 쓴 날부터 낡기 시작합니다.

## 5. AI 코딩 도구가 읽는 경로

검색 엔진 말고 AI 코딩 도구가 문서를 찾는 경로도 정리했습니다.

- **llms.txt**: 사이트 루트에 AI 용 문서 목록을 두고, 새 문서 쪽·비교 쪽 줄을 더했습니다. 모든 props 정의를 한 파일에 담은 `llms-full.txt` 는 빌드 때 소스에서 만듭니다.
- **규칙 파일**: 사용자가 프로젝트에 넣는 `bestow-ui.md`(Cursor 용 `.mdc` 포함). 규칙에 적은 컴포넌트·함수 이름이 실제 export 에 없으면 빌드가 실패합니다.
- **Context7**: Cursor·Claude Code 가 라이브러리 문서를 가져오는 서비스입니다.

Context7 에서는 예상과 다른 일이 몇 가지 있었습니다.

- 공식 문서에는 "영어 문서만 색인하고, 다른 언어가 주인 쪽은 건너뛴다" 고 되어 있어서 한국어 문서는 실패할 줄 알았습니다. 실제로는 **조각 928개가 색인됐습니다.**
- 그런데 출처를 세어 보니 `ROADMAP.md`·`CLAUDE.md` 같은 **내부 작업 문서가 섞여** 있었습니다. AI 에게 "Replace the placeholder…" 같은 엉뚱한 예시가 갈 수 있습니다.
- 저장소 루트의 `context7.json` 으로 제외 목록을 정했습니다. 여기에 목록을 적으면 기본 제외 목록(`CHANGELOG.md`, `archive` 등)을 **대체**하므로 기본값도 함께 적어야 합니다.
- `rules`(AI 에게 주는 사용 규칙)는 한 줄 255자 제한이 있고, **하나라도 거절되면 전부 빠집니다.** 외부 주소를 읽으라는 규칙처럼 거절될 만한 것은 뺐습니다.

적용 뒤 조각은 434개로 줄었고 출처는 모두 README·Storybook 가이드·마이그레이션 문서 같은 사용자 문서가 됐습니다. 규칙 12개는 문서 맨 앞에 "LIBRARY RULES" 로 붙어 나갑니다. 스타 4개라 자동 인증 기준에는 못 미쳤지만, 양식으로 신청한 인증은 통과했습니다.

## 6. 측정은 한 달에 한 번, 같은 방법으로

GEO 는 결과가 날마다 달라서 감으로 판단하기 어렵습니다. 그래서 같은 질문 5개를 정해 두고, 한 달에 한 번 ChatGPT·Perplexity·Gemini 에 로그인하지 않은 새 창으로 묻기로 했습니다.

1. React 에서 전화번호 하이픈 자동 입력 컴포넌트 추천해 줘
2. 사업자등록번호 검증 React
3. 한국 서비스용 React 디자인 시스템
4. KWCAG 접근성 지킨 React 컴포넌트 라이브러리
5. 약관 전체 동의 체크박스 React 접근성

질문마다 "링크로 인용 / 이름만 언급 / 없음" 을 적고, 같은 줄에 Search Console 의 노출·클릭·색인 수와 방문 통계의 AI 유입(chatgpt.com·perplexity.ai)을 함께 적습니다. AI 가 틀린 설명(없는 prop, 옛 API)을 하면 따로 적어 둡니다. 문서를 고칠 단서가 되기 때문입니다.

첫 기록은 새 쪽이 색인될 시간을 두고 12월 초에 남깁니다. 결과가 쌓이면 다시 정리하겠습니다.

## 정리

- Storybook 만으로는 검색에 잡히지 않습니다. 검색어가 분명한 컴포넌트부터 정적 문서 쪽을 따로 만들고, 내용은 **소스에서 읽어** 코드와 어긋나지 않게 합니다. 못 읽으면 빌드를 실패시킵니다.
- JSON-LD 는 `<` 를 바꿔 넣고, 리치 결과 테스트는 배포가 끝난 뒤 돌리며, Article 권장 속성까지 채웁니다.
- 네이버 제목 40자·설명 80자처럼 다시 깨지기 쉬운 규칙은 E2E 로 고정합니다.
- 비교 표에는 근거 링크와 확인한 날짜를 달고, 다른 라이브러리를 깎아내리지 않습니다.
- AI 도구용 경로(llms.txt, 규칙 파일, Context7)에서는 **내부 문서가 섞이지 않았는지** 꼭 확인합니다.

문서 쪽은 [한국 서비스 입력 컴포넌트](https://bestow-ui.com/components/) 와 [서식·검증 함수](https://bestow-ui.com/korean-utils/) 에서 볼 수 있습니다.
