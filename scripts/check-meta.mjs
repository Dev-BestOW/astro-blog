// 글 제목·설명이 검색 노출 기준에 맞는지 검사한다(네이버 서치어드바이저 웹마스터 가이드 — CLAUDE.md "글 쓰는 법 › 검색 노출").
// - 제목 40자, 설명 80자 이내(네이버 "사이트 간단 체크" 권장)
// - 제목·설명 각각에서 같은 낱말을 두 번 이상 쓰지 않는다("키워드 반복·남용") — 경고만. 조사까지 붙여 세는 단순한 방식이라
//   "미디어 쿼리는 … 컨테이너 쿼리는" 같은 비교 문장과 키워드 반복을 가리지 못한다. 경고가 나오면 사람이 읽고 판단한다.
// 발행 글(src/content/posts)과 예약 글(content-queue — Astro 컬렉션 밖이라 스키마로 못 잡는다)을 함께 본다.
// `pnpm check` 에 포함돼 로컬 검증·CI 에서 돈다. 단독 실행: `node scripts/check-meta.mjs`.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const TITLE_MAX = 40;
export const DESCRIPTION_MAX = 80;
const DIRS = ['src/content/posts', 'content-queue'];

/** 프론트매터에서 한 줄짜리 문자열 값을 읽는다('…'·"…"·따옴표 없음). */
export function readField(source, key) {
  const front = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const line = front.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim();
  if (line === undefined) return undefined;
  if (line.startsWith("'") && line.endsWith("'")) return line.slice(1, -1).replace(/''/g, "'");
  if (line.startsWith('"') && line.endsWith('"')) return JSON.parse(line);
  return line;
}

/** 두 번 이상 나온 낱말(한글·영문 두 글자 이상) */
export function repeatedWords(text) {
  const counts = new Map();
  for (const word of text.toLowerCase().match(/[가-힣a-z@_.]{2,}/g) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n > 1).map(([w]) => w);
}

/** 실패(길이·빈 값·제목=설명)와 경고(낱말 반복)를 나눠 돌려준다. */
export function checkMeta(title, description) {
  const problems = [];
  const warnings = [];
  if (!title) problems.push('title 없음');
  if (!description) problems.push('description 없음');
  if (title && title.length > TITLE_MAX)
    problems.push(`title ${title.length}자 (최대 ${TITLE_MAX})`);
  if (description && description.length > DESCRIPTION_MAX)
    problems.push(`description ${description.length}자 (최대 ${DESCRIPTION_MAX})`);
  if (title && description && title === description) problems.push('title 과 description 이 같음');
  if (title && repeatedWords(title).length)
    warnings.push(`title 낱말 반복: ${repeatedWords(title).join(', ')}`);
  if (description && repeatedWords(description).length)
    warnings.push(`description 낱말 반복: ${repeatedWords(description).join(', ')}`);
  return { problems, warnings };
}

async function main() {
  let failed = 0;
  let checked = 0;
  for (const dir of DIRS) {
    const files = (await readdir(dir).catch(() => [])).filter(
      (f) => /\.mdx?$/.test(f) && f.toLowerCase() !== 'readme.md',
    );
    for (const file of files) {
      const source = await readFile(join(dir, file), 'utf8');
      const { problems, warnings } = checkMeta(
        readField(source, 'title'),
        readField(source, 'description'),
      );
      checked += 1;
      if (problems.length) {
        failed += 1;
        console.error(`✗ ${dir}/${file}\n  - ${problems.join('\n  - ')}`);
      }
      if (warnings.length)
        console.warn(
          `! ${dir}/${file} (경고 — 키워드 반복인지 읽고 판단)\n  - ${warnings.join('\n  - ')}`,
        );
    }
  }
  if (failed) {
    console.error(
      `\n${failed}편이 검색 노출 기준(제목 ${TITLE_MAX}자·설명 ${DESCRIPTION_MAX}자)을 넘었습니다. CLAUDE.md "글 쓰는 법 › 검색 노출" 참고.`,
    );
    process.exit(1);
  }
  console.log(
    `✓ 글 ${checked}편 제목·설명 검사 통과 (제목 ≤${TITLE_MAX}, 설명 ≤${DESCRIPTION_MAX})`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
