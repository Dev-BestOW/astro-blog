# 개발 블로그 — 로드맵 / 남은 작업

> 스펙·결정의 단일 기준은 [SPEC.md](./SPEC.md), 여기는 **남은 일**만 둔다. 끝난 항목의 상세는 [ROADMAP-HISTORY.md](./ROADMAP-HISTORY.md).
> 항목을 시작하면 상태를 갱신하고, 끝나면 SPEC.md 변경 이력에 한 줄 남긴 뒤 이 문서에서 HISTORY 로 옮긴다.

- **기준일**: 2026-11-20
- **상태 범례**: ⬜ 예정 · 🟡 진행 중 · 👤 사람이 할 일

---

## 남은 일

| 상태 | 항목                       | 한 줄 요약                                                                                                                                                                                                                                         | 규모 |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 🟡👤 | 광고(AdSense) 심사         | 코드·신청 끝, Google 심사 대기(2026-11-17 "검토 중"). 승인되면 자동 광고 켜기 또는 `adsenseSlot` — [ADS.md](./ADS.md)                                                                                                                              | XS   |
| ⬜   | 옛 workers.dev 주소 재확인 | 2026-11-17 대시보드에서 껐다. `wrangler.jsonc` 에 `workers_dev` 가 없어 배포 때 다시 켜질 수 있다 — 다음 배포 뒤 `https://astro-blog.dev-bestow.workers.dev/` 가 404 인지 보고, 200 이면 `"workers_dev": false` 추가를 검토                        | XS   |
| ⬜   | IndexNow                   | 새 글을 네이버(·Bing 등)에 바로 알림. 루트에 키 파일 + `daily-post.yml` 발행 뒤 `https://searchadvisor.naver.com/indexnow` 호출. 색인 보장은 아님                                                                                                  | S    |
| ⬜   | 검색 노출 다시 보기        | 2026-11-20 제목·설명 손봄(SPEC 변경 이력). 12월 초 Search Console 28일 노출·검색어가 늘었는지, BestOW 글(11/15~)이 잡히는지 확인. 11/20 에 제목을 바꾼 10편(8편 + view-transitions·SEO 글, sms-otp 는 같은 날 두 번)은 그때까지 다시 손대지 않는다 | XS   |
| ⬜   | 표 가로 넘침               | `business-number-checksum` 일의 자리 표가 320px 에서 453px 로 넘침(운영도 같음) — 본문 표를 가로 스크롤 상자로 감싸기, 다른 글 표도 함께 확인                                                                                                      | XS   |
| ⬜   | 조회수 표시                | 수집(Cloudflare Web Analytics)은 됨. 글에 조회수를 보이려면 KV·D1 등 저장소가 필요 — 정적 배포와의 트레이드오프를 먼저 정한다                                                                                                                      | M    |
| ⬜   | i18n (다국어)              | Astro i18n 라우팅(`/en/…`)·언어 스위처·`hreflang`. URL 구조에 영향이 커서 도입 전 설계                                                                                                                                                             | L    |
| ⬜   | 이미지 파이프라인 점검     | heroImage 를 쓰는 글이 생기면 `astro:assets` 반응형 `widths`·`sizes` 실측·조정                                                                                                                                                                     | S    |

규모: XS(<30분) · S(반나절) · M(1–2일) · L(3일+)

---

## 끝난 것 (요약)

품질 기반(ESLint·Prettier·CI·robots.txt·JSON-LD), 콘텐츠 경험(Pagefind 검색·giscus 댓글·시리즈), 디자인(Pretendard·accent 토큰·사이드바 목차·홈 소개·모바일 헤더·코드블록),
기술 부채(OG 글꼴 서브셋·heroImage 정책), 커스텀 도메인·DNS 정리(www·HTTPS·SPF·DMARC)·옛 workers.dev 주소 끄기, 애널리틱스 수집, 2026-11-17 점검(가독성·접근성·글꼴 경량화·소개·글 끝 이동·시리즈 묶기).
상세는 [ROADMAP-HISTORY.md](./ROADMAP-HISTORY.md), 그 뒤 변경은 SPEC 변경 이력.
