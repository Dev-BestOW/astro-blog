// 사이트맵 <lastmod> — 글 쪽(/posts/<id>/)에만 단다. 값은 frontmatter 의 updatedDate, 없으면 pubDate
// (글 머리에 보이는 날짜·JSON-LD dateModified 와 같은 값). 목록·태그·소개 쪽은 날짜를 달지 않는다 —
// 빌드 날짜를 달면 내용이 그대로인데 날짜만 바뀌어 구글이 lastmod 를 믿지 않게 된다.
// astro.config.mjs 에서 불러서 astro:content 를 못 쓰므로 글 파일을 직접 읽는다(id = 파일 이름, content.config.ts 의 glob 과 같은 규칙).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATE = /^(\d{4}-\d{2}-\d{2})$/;

/** frontmatter 한 줄 값 — 따옴표를 벗긴다 */
function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
}

/** 글 id → 'YYYY-MM-DD'. 초안은 사이트맵에 없으니 뺀다 */
export function postLastmods(postsDir) {
  const dates = new Map();
  for (const file of readdirSync(postsDir)) {
    if (!/\.mdx?$/.test(file)) continue;
    const source = readFileSync(join(postsDir, file), 'utf8');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1];
    if (!frontmatter) throw new Error(`${file}: frontmatter 가 없어요`);
    if (field(frontmatter, 'draft') === 'true') continue;
    const date = field(frontmatter, 'updatedDate') ?? field(frontmatter, 'pubDate');
    // 형식이 다르면 조용히 빠지지 않게 빌드를 멈춘다
    if (!date || !DATE.test(date))
      throw new Error(`${file}: updatedDate·pubDate 를 YYYY-MM-DD 로 읽지 못했어요 (${date})`);
    dates.set(file.replace(/\.mdx?$/, ''), date);
  }
  return dates;
}

/** @astrojs/sitemap 의 serialize — 글 쪽이면 lastmod 를 단다 */
export function withPostLastmod(postsDir) {
  const dates = postLastmods(postsDir);
  return (item) => {
    const id = new URL(item.url).pathname.match(/^\/posts\/([^/]+)\/$/)?.[1];
    const date = id && dates.get(decodeURIComponent(id));
    return date ? { ...item, lastmod: date } : item;
  };
}
