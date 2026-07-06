/**
 * OG 이미지용 Pretendard 폰트 서브셋 생성 스크립트.
 *
 * OG 렌더(src/lib/og.ts)에 필요한 글자만 남긴 WOFF를 만든다.
 * 원본 OTF(각 ~1.5MB)는 레포에 두지 않으므로, 재생성이 필요하면
 * Pretendard 배포(https://github.com/orioncactus/pretendard)에서
 * Pretendard-Bold.otf / Pretendard-Regular.otf 를 내려받아
 * src/assets/fonts/ 에 둔 뒤 실행:
 *
 *   node scripts/subset-fonts.mjs
 *
 * 커밋 대상은 결과물인 *.subset.woff 뿐이다(원본 OTF는 커밋하지 않음).
 */
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const fontDir = path.resolve('src/assets/fonts');

// 유지할 문자 집합 = OG 텍스트(사이트명 + 임의 한국어 제목/설명 + host)에 필요한 범위.
// 현대 한글 음절 전체를 포함해 어떤 제목이 와도 두부(□)가 없도록 한다.
const ranges = [
  [0x0020, 0x007e], // 기본 라틴 (영문·숫자·기호)
  [0x00a0, 0x00ff], // 라틴-1 보충 (·, ©, ×, 악센트)
  [0x2010, 0x2027], // 대시·인용부호·… 일반 구두점
  [0x20a9, 0x20a9], // ₩ 원화
  [0x2190, 0x2199], // 화살표
  [0x3000, 0x303f], // CJK 기호·구두점
  [0x3131, 0x3163], // 한글 호환 자모 (ㅋㅋ, ㅠㅠ)
  [0xac00, 0xd7a3], // 현대 한글 음절 전체
];

let chars = '';
for (const [start, end] of ranges) {
  for (let cp = start; cp <= end; cp++) chars += String.fromCodePoint(cp);
}

const targets = [
  { in: 'Pretendard-Bold.otf', out: 'Pretendard-Bold.subset.woff' },
  { in: 'Pretendard-Regular.otf', out: 'Pretendard-Regular.subset.woff' },
];

for (const t of targets) {
  const src = path.join(fontDir, t.in);
  if (!fs.existsSync(src)) {
    console.error(`원본 폰트 없음: ${src}\nPretendard에서 내려받아 두고 다시 실행하세요.`);
    process.exit(1);
  }
  const buf = fs.readFileSync(src);
  const out = await subsetFont(buf, chars, { targetFormat: 'woff' });
  fs.writeFileSync(path.join(fontDir, t.out), out);
  const pct = (100 - (out.length / buf.length) * 100).toFixed(1);
  console.log(
    `${t.in} (${(buf.length / 1024).toFixed(0)}KB) -> ${t.out} (${(out.length / 1024).toFixed(0)}KB, -${pct}%)`,
  );
}
console.log(`kept ${chars.length} chars`);
