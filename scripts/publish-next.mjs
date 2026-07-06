// 예약 발행: content-queue/에서 다음 글 1편을 꺼내 src/content/posts/로 이동한다.
// - 발행 순서: 파일명 오름차순(예: 001-..., 002-...). 선행 숫자 접두어(`\d+[-_]`)는
//   목적지 slug에서 제거해 URL을 깔끔하게 만든다.
// - pubDate: 프론트매터의 pubDate를 "발행일(KST)"로 덮어쓴다(없으면 삽입).
// - 큐가 비면 아무것도 하지 않고 정상 종료(exit 0) → 워크플로가 커밋을 건너뛴다.
// GitHub Actions(.github/workflows/daily-post.yml)에서 매일 실행된다. 로컬 테스트: `node scripts/publish-next.mjs`.

import { readdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import { join } from 'node:path';

const QUEUE_DIR = 'content-queue';
const POSTS_DIR = 'src/content/posts';

// KST(UTC+9) 기준 오늘 날짜 YYYY-MM-DD
function kstToday() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const files = (await readdir(QUEUE_DIR).catch(() => []))
  .filter((f) => /\.mdx?$/.test(f) && f.toLowerCase() !== 'readme.md')
  .sort();

if (files.length === 0) {
  console.log(`큐가 비어 있습니다(${QUEUE_DIR}/). 발행할 글 없음 — 종료.`);
  process.exit(0);
}

const src = files[0];
const today = kstToday();
let content = await readFile(join(QUEUE_DIR, src), 'utf8');

// 프론트매터 존재 확인
if (!/^---\r?\n[\s\S]*?\r?\n---/.test(content)) {
  console.error(`프론트매터(---)를 찾지 못함: ${src}. 발행 중단.`);
  process.exit(1);
}

// pubDate를 발행일로 설정(있으면 교체, 없으면 frontmatter 첫 줄 뒤 삽입)
if (/^pubDate:.*$/m.test(content)) {
  content = content.replace(/^pubDate:.*$/m, `pubDate: ${today}`);
} else {
  content = content.replace(/^---\r?\n/, `---\npubDate: ${today}\n`);
}

// 목적지 slug: 선행 정렬 접두어 제거(001-foo.md → foo.md)
const dest = src.replace(/^\d+[-_]/, '');

if (await exists(join(POSTS_DIR, dest))) {
  console.error(`이미 존재하는 글과 파일명 충돌: ${POSTS_DIR}/${dest}. 발행 중단(덮어쓰기 방지).`);
  process.exit(1);
}

await writeFile(join(POSTS_DIR, dest), content);
await unlink(join(QUEUE_DIR, src));

console.log(`발행: ${QUEUE_DIR}/${src} → ${POSTS_DIR}/${dest} (pubDate=${today})`);
