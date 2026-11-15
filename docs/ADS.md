# 광고 붙이기 (AdSense · 카카오 애드핏)

광고 관련 코드는 모두 `src/config.ts` 의 `ads` 값으로 켜고 끈다. 값이 비어 있으면 광고 스크립트·광고 칸이 하나도 그려지지 않는다.

| 값                               | 채우면                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ads.adsenseClient` (`ca-pub-…`) | 모든 쪽 `<head>` 에 소유 확인 메타(`google-adsense-account`)와 AdSense 스크립트(자동 광고), `/ads.txt` 에 `google.com, pub-…, DIRECT, f08c47fec0942fa0` |
| `ads.adsenseSlot` (숫자)         | 글 끝 광고 칸(`AdSlot.astro`, 댓글 위)에 그 수동 광고 단위                                                                                              |
| `ads.adfitUnit` (`DAN-…`)        | AdSense 광고 단위가 없을 때 글 끝 광고 칸에 애드핏. 개인정보처리방침에 카카오 항목이 함께 나온다                                                        |

관련 파일: `src/components/AdSlot.astro`, `src/pages/ads.txt.ts`, `src/pages/privacy.astro`(푸터 링크), `src/layouts/BaseLayout.astro`(head).

## AdSense 신청 순서

1. https://adsense.google.com 에서 사이트 `jiwon-seok.com` 추가 → 게시자 ID(`ca-pub-…`)를 받는다.
2. `ads.adsenseClient` 에 넣고 push → 배포되면 `/ads.txt` 와 head 메타가 생긴다. AdSense 화면에서 "사이트 확인" 을 누른다.
3. 심사(며칠~몇 주). 그동안 글을 꾸준히 올린다. 심사는 독창적인 글의 양·탐색 구조·개인정보처리방침을 본다.
4. 승인되면 AdSense 에서 자동 광고를 켜거나, 디스플레이 광고 단위를 만들어 그 ID 를 `ads.adsenseSlot` 에 넣는다.
5. 유럽(EEA·영국) 방문자에게 광고를 보이려면 AdSense › 개인 정보 보호 및 메시지에서 Google 동의 메시지(CMP)를 켠다.

## 카카오 애드핏

https://adfit.kakao.com 에서 매체(웹)를 등록하고 광고 단위를 만든다. 크기(기본 320×100)를 `adfitWidth`·`adfitHeight` 로 맞춘다.
AdSense 광고 단위와 함께 채우면 글 끝 칸에는 AdSense 가 들어간다(한 칸에 하나).

## 광고를 바꾸면

개인정보처리방침(`privacy.astro`)이 실제 쓰는 서비스와 맞는지 확인하고 시행일을 고친다.
