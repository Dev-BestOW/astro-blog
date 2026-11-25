// IndexNow — 새로 올리거나 고친 쪽의 주소를 검색 엔진에 바로 알린다(색인을 보장하지는 않는다).
// 사용: node scripts/indexnow.mjs https://jiwon-seok.com/posts/foo/ [더 많은 주소…]
//       --dry-run 을 붙이면 보내지 않고 보낼 내용만 출력한다. 대기 시간은 INDEXNOW_WAIT_MS 로 바꿀 수 있다(시험용).
//
// - 키 파일: public/<KEY>.txt (내용 = 키). 공개해도 되는 값이다 — 이 키 파일이 사이트에 있어야 제출이 받아들여진다.
// - 보내는 곳: 네이버(searchadvisor.naver.com)와 IndexNow 공용(api.indexnow.org → Bing 등 참여 엔진에 공유).
//   참여 엔진끼리 제출을 공유하지만, 이 블로그는 네이버가 중요해서 네이버에도 직접 보낸다.
// - 배포 직후 쓰므로, 주소마다 200 이 될 때까지 기다린 뒤 보낸다(최대 WAIT_MS). 아직 없는 쪽을 알리면 의미가 없다.
// - 응답: 200 성공, 202 받음(키 확인 대기 — 첫 제출 때 흔함), 400 형식 오류, 403 키 파일 없음·불일치,
//   422 다른 호스트 주소·키 형식 오류, 429 너무 잦음. 4xx 면 실패(exit 1) — 워크플로에서는 발행을 막지 않게 따로 둔다.
// 프로토콜: https://www.indexnow.org/documentation

import { readFile } from 'node:fs/promises';

const SITE = 'https://jiwon-seok.com'; // src/config.ts SITE_URL 과 같게
const KEY = '98a1af9fcf71704a5a83646e64a4ed3a';
const ENDPOINTS = ['https://searchadvisor.naver.com/indexnow', 'https://api.indexnow.org/indexnow'];
const WAIT_MS = Number(process.env.INDEXNOW_WAIT_MS ?? 10 * 60 * 1000);
const POLL_MS = Math.min(15 * 1000, WAIT_MS);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const urls = [
    ...new Set(
      args
        .filter((arg) => arg !== '--dry-run')
        .flatMap((arg) => arg.split(/\s+/))
        .filter(Boolean),
    ),
  ];
  if (urls.length === 0) {
    console.error(
      '알릴 주소가 없습니다. 예: node scripts/indexnow.mjs https://jiwon-seok.com/posts/foo/',
    );
    process.exit(1);
  }

  // 키 파일이 저장소에 있고 내용이 키와 같은지(오타로 403 이 나는 것을 막는다)
  const keyFile = (await readFile(new URL(`../public/${KEY}.txt`, import.meta.url), 'utf8')).trim();
  if (keyFile !== KEY) throw new Error(`public/${KEY}.txt 내용이 키와 다릅니다.`);

  const host = new URL(SITE).host;
  for (const url of urls) {
    if (new URL(url).host !== host) throw new Error(`${host} 가 아닌 주소입니다: ${url}`);
  }

  // 배포가 끝나 쪽이 열릴 때까지 기다린다 — 키 파일도 함께
  const deadline = Date.now() + WAIT_MS;
  for (const url of [`${SITE}/${KEY}.txt`, ...urls]) {
    for (;;) {
      const res = await fetch(url, { method: 'GET', redirect: 'manual' }).catch(() => null);
      if (res?.status === 200) {
        console.log(`열림: ${url}`);
        break;
      }
      if (Date.now() > deadline)
        throw new Error(
          `${Math.round(WAIT_MS / 1000)}초 안에 200 이 되지 않았습니다: ${url} (${res?.status ?? '연결 실패'})`,
        );
      await sleep(POLL_MS);
    }
  }

  const body = JSON.stringify({ host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls });
  if (dryRun) {
    console.log(`--dry-run: 보내지 않음. 보낼 곳 ${ENDPOINTS.join(', ')}\n${body}`);
    return;
  }
  let failed = false;
  for (const endpoint of ENDPOINTS) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
    }).catch((error) => ({ status: 0, statusText: String(error), text: async () => '' }));
    const text = (await res.text()).slice(0, 200);
    const ok = res.status === 200 || res.status === 202;
    if (!ok) failed = true;
    console.log(
      `${ok ? '성공' : '실패'} ${res.status} ${endpoint} (${urls.length}개)${text ? ` — ${text}` : ''}`,
    );
  }
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
