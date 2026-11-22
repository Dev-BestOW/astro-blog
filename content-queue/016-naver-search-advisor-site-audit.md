---
title: '네이버 서치어드바이저 가이드로 사이트 점검 — 고친 7가지'
description: '웹마스터 가이드 54개 문서와 구글 Search Central 로 문서 사이트를 대조해 파비콘·이동 경로·사이트 이름을 고쳤습니다.'
tags: ['seo', 'nextjs', 'design-system']
series: 'BestOW UI 만들기'
draft: false
---

[지난 글](/posts/design-system-docs-seo-geo/)에서 React 디자인 시스템 [BestOW UI](https://bestow-ui.com/) 의 문서를 검색 엔진이 읽을 수 있는 정적 쪽으로 만든 이야기를 했습니다. 그때는 필요한 것부터 골라 고쳤습니다. 이번에는 순서를 바꿨습니다. **공식 가이드를 처음부터 끝까지 읽고**, 사이트의 모든 쪽을 거기에 대조했습니다.

- [네이버 서치어드바이저 웹마스터 가이드](https://searchadvisor.naver.com/guide) 54개 문서 전체
- [Google Search Central](https://developers.google.com/search/docs?hl=ko) 핵심 44쪽(나머지는 훑음)

두 곳 모두 2026-11-20 에 읽은 내용 기준입니다. 이 글은 그 결과로 고친 7가지와, 고칠 필요가 없던 것을 정리합니다. 검색 결과에 반영되는 데는 며칠~몇 주가 걸려서, 효과는 아직 적지 않습니다.

## 점검 방법

사이트맵에 있던 34쪽을 네이버 검색로봇 이름(`Yeti`)으로 받아 쪽마다 title·description·canonical·OG·파비콘·h1·이미지 alt·JSON-LD 이동 경로를 확인했습니다. 이 검사는 스크립트로 만들어 두었고, 그 과정은 다음 글에 씁니다.

이미 기준에 맞던 것도 많았습니다.

- `robots.txt` 가 `text/plain` 으로 나간다
- http → https, www → 대표 주소가 **301** 로 넘어간다
- 없는 쪽은 실제 **404** 상태를 준다(안내 화면을 200 으로 주면 "소프트 404")
- 사이트맵이 같은 호스트의 절대 주소, canonical 이 절대 주소, viewport·이미지 alt 가 있다

## 네이버 기준으로 고친 4가지

### 1. 파비콘 주소를 절대 경로로

네이버 가이드의 [파비콘 문서](https://searchadvisor.naver.com/guide/markup-favicon)는 `href` 를 **절대 경로**로 쓰라고 합니다. 소개 사이트는 Next.js 의 파일 규칙(`app/icon.svg`)으로 파비콘을 넣었는데, 이 방식은 상대 경로로 나옵니다. 파일을 `public` 으로 옮기고 `metadata.icons` 에 배포 주소를 직접 적었습니다.

Storybook 은 템플릿이 `./favicon.svg` 를 넣습니다. 링크를 하나 더 달면 같은 `rel` 의 파비콘이 둘이 됩니다. 가이드가 같은 rel 은 하나만 두라고 해서, 배포 폴더를 모으는 스크립트가 그 주소를 바꾸게 했습니다(실제 코드).

```bash
sb_favicon='https://bestow-ui.com/storybook/favicon.svg'
perl -pi -e "s#href=\"\\./favicon\\.svg\"#href=\"$sb_favicon\"#" "$out/storybook/index.html"
grep -q "rel=\"icon\"[^>]*href=\"$sb_favicon\"" "$out/storybook/index.html" || { echo "::error::Storybook 파비콘을 절대 주소로 바꾸지 못했습니다(템플릿이 바뀌었는지 확인)"; exit 1; }
```

마지막 줄이 중요합니다. Storybook 을 올려 템플릿이 바뀌면 치환이 조용히 아무 일도 안 할 수 있습니다. 그때는 배포가 실패합니다.

### 2. 제목이 같은 예제 앱 5쪽을 검색에서 빼기

사이트맵에 Next.js 예제 앱(playground) 5쪽이 들어 있었습니다. 실제 설치와 같은 조건으로 동작을 확인하는 데모라, 쪽마다 제목이 같았습니다. 네이버 가이드는 중복 콘텐츠와 같은 제목을 피하라고 합니다([최적화의 목적](https://searchadvisor.naver.com/guide/seo-basic-intro)).

예제 앱은 검색으로 찾아올 쪽이 아니라서 사이트맵에서 빼고(34 → 29쪽) `noindex, follow` 를 달았습니다. `follow` 는 그 쪽의 링크는 계속 따라가게 하는 값입니다.

```ts
// 예제 앱이라 검색에서 뺀다(쪽마다 제목이 같아 중복 문서). 링크는 따라가게 follow — 사이트맵에도 넣지 않는다
robots: { index: false, follow: true },
```

여기에 `robots.txt` 로 막는 것까지 더하면 안 됩니다. 로봇이 쪽을 못 읽으면 `noindex` 도 못 읽습니다.

### 3. 이동 경로 첫 이름 "홈" → 사이트 이름

문서 쪽의 이동 경로(화면 Breadcrumb 과 `BreadcrumbList` JSON-LD)가 "홈 › 한국 입력 컴포넌트" 였습니다. 네이버 [이동 경로 문서](https://searchadvisor.naver.com/guide/structured-data-breadcrumb)는 "top"·"홈" 같은 일반 낱말을 쓰지 말고 쪽 계층을 설명하는 이름을 쓰라고 합니다. 첫 이름을 "BestOW UI" 로 바꿨습니다. 구글은 이 부분에 제한이 없지만, 네이버 기준을 따르면 두 곳 모두 문제없습니다.

### 4. Storybook 제목 55자 → 29자

네이버 [사이트 간단 체크](https://searchadvisor.naver.com/guide/diagnose-site)는 제목 40자·설명 80자를 권장합니다. Storybook 쪽 제목은 "BestOW UI — 한국 서비스를 위한 접근성 검증 React 디자인 시스템 - Storybook" 으로 55자였습니다(뒤의 " - Storybook" 은 Storybook 이 붙입니다). "BestOW UI 컴포넌트 문서 - Storybook"(29자)으로 줄였습니다.

## 구글 기준으로 고친 3가지

네이버 기준을 다 맞춘 뒤 구글 문서를 읽었더니, 네이버와 다른 점이 세 군데에서 걸렸습니다.

### 5. 파비콘 SVG → PNG·ICO

네이버는 SVG 파비콘을 받습니다. 그런데 구글의 [검색 결과 파비콘 문서](https://developers.google.com/search/docs/appearance/favicon-in-search)가 적은 형식은 BMP·GIF·ICO·PNG·JPEG·PPM·TIFF 이고, **SVG 는 없습니다.** 같은 구글 문서라도 일반 이미지 형식 목록에는 SVG 가 있어서 헷갈리기 쉽습니다. 파비콘에는 파비콘 문서의 목록이 적용됩니다.

크기는 구글이 48×48px 보다 크게, 네이버가 32px 이상을 권장합니다. 그래서 96×96 PNG 를 `<link rel="icon">` 하나로 걸고, 링크를 읽지 못하는 도구를 위해 루트에 `favicon.ico`(32·48px)를 두었습니다. 두 파일은 원본 `icon.svg` 를 시스템 Chrome 으로 찍어 만드는 스크립트(`scripts/generate-favicons.mjs`)로 만듭니다. 아이콘을 바꾸면 다시 실행하면 됩니다.

```ts
icons: { icon: { url: `${siteOrigin}${basePath}/icon-96.png`, type: 'image/png', sizes: '96x96' } },
```

### 6. 사이트 이름을 `WebSite` JSON-LD 로

구글은 검색 결과에 보이는 사이트 이름을 **첫 화면의 `WebSite` 구조화 데이터**로 정합니다([사이트 이름 문서](https://developers.google.com/search/docs/appearance/site-names)). 첫 화면에만 둡니다(실제 코드).

```ts
/**
 * 첫 화면 — 사이트 이름. 구글은 검색 결과의 사이트 이름을 첫 화면의 WebSite `name` 으로 정한다(첫 화면에만, og:site_name 과 같은 이름)
 */
export function webSite() {
  return {
    '@context': context,
    '@type': 'WebSite',
    name: 'BestOW UI',
    url: absoluteUrl('/'),
  };
}
```

`og:site_name`·title 에 쓴 이름과 같게 맞췄습니다. 첫 화면에 이 데이터가 있는지는 단위 테스트와 E2E 가 확인합니다.

### 7. Storybook 설명 113자 → 75자

설명은 컴포넌트 이름을 모두 늘어놓느라 113자였습니다. 같은 내용을 "무엇을 볼 수 있는 곳인가" 로 바꿔 75자로 줄였습니다.

> 약관 동의·인증번호·전화번호·사업자등록번호·금액·주소 입력의 예시와 props, 키보드·스크린리더 동작, KWCAG 2.2 대응 근거.

## 하지 않은 것

가이드를 읽다 보면 할 일이 늘어나는데, 효과가 확인되지 않은 것은 미뤘습니다.

- **llms.txt 는 구글 검색에 쓰이지 않습니다.** 구글은 AI 개요에 따로 할 일이 없고, 색인되고 스니펫을 보여 줄 수 있으면 대상이라고 합니다. llms.txt 는 AI 코딩 도구용으로 이미 있어서 그대로 두었습니다.
- **질문마다 쪽을 따로 만들지 않았습니다.** 비슷한 쪽을 찍어 내는 것은 네이버 "웹 콘텐츠 스팸사례"의 대량 발행이고, 구글도 스팸 정책(scaled content abuse)으로 봅니다.
- **문서 쪽마다 다른 OG 이미지는 아직입니다.** 29쪽이 같은 `og.png` 를 씁니다. 네이버는 여러 쪽에 반복되는 이미지를 대표 이미지로 쓰지 않을 수 있다고 해서 남은 일로 적어 두었습니다.

## 정리

- 일반적인 SEO 상식으로는 네이버의 **숫자 기준**(제목 40자·설명 80자)과 **네이버에만 있는 규칙**(이동 경로 "홈" 금지, 파비콘 절대 경로)을 놓치기 쉽습니다.
- 구글은 숫자 기준이 느슨하지만 **다른 규칙**이 있습니다(SVG 파비콘 불가, 사이트 이름은 `WebSite` 데이터). 두 곳에 맞추려면 더 엄격한 쪽을 따르면 됩니다.
- 고친 것마다 검사를 남겼습니다. 치환이 실패하면 배포가 멈추고, 사이트 이름 데이터는 테스트가 확인합니다. 가이드를 한 번 읽고 끝내지 않고, 다음에 바뀌는 코드가 다시 어기지 않게 하는 쪽이 오래 갑니다.

이 점검표와 검사 스크립트는 다른 사이트에도 쓸 수 있게 Claude Code 스킬로 묶었습니다. 그 이야기는 다음 글에 이어집니다.
