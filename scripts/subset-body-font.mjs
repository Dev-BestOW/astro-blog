/**
 * 본문(사이트 UI/글) 웹폰트용 Pretendard Variable 서브셋 생성 스크립트.
 *
 * OG 이미지용 서브셋(scripts/subset-fonts.mjs, 정적 400/700 WOFF)과는 별개다.
 * 이건 사이트 본문에 self-host 하는 **가변(Variable) WOFF2 한 개**를 만든다.
 * 하나의 파일에 전 weight(Thin~Black)가 들어 있어 400/500/600/700을 모두 실제 렌더한다.
 *
 * 원본은 devDependency로 설치된 pretendard 패키지의 Variable WOFF2.
 * 재생성:
 *
 *   pnpm add -D pretendard   # (이미 설치돼 있으면 생략)
 *   node scripts/subset-body-font.mjs
 *
 * 커밋 대상은 결과물 src/assets/fonts/PretendardVariable.subset.woff2 뿐이다.
 */
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const src = path.resolve(
  'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
);
const outPath = path.resolve('src/assets/fonts/PretendardVariable.subset.woff2');

// 유지할 문자 = pretendard 공식 상용 글자 목록(라틴 + 상용 한글 2,780자 + 기호)에
// 화살표·원화·자모 등 UI에 쓰는 범위를 보탠다. 목록에 없는 희귀 음절은 CSS
// 폴백 스택(시스템 한글 폰트)이 대신 렌더하므로 두부(□)는 발생하지 않는다.
// 전체 음절(11,172자)을 넣으면 1.7MB이지만 이 상용 서브셋은 ~0.6MB로 가볍다.
const glyphList = fs.readFileSync(
  path.resolve('node_modules/pretendard/subset_glyphs.txt'),
  'utf8',
);
const extraRanges = [
  [0x2010, 0x2027], // 대시·인용부호·… 일반 구두점
  [0x20a9, 0x20a9], // ₩ 원화
  [0x2190, 0x2199], // 화살표 (← ↑ → ↓ …)
  [0x3130, 0x3163], // 한글 호환 자모 (ㅋㅋ, ㅠㅠ)
];
let extra = '';
for (const [start, end] of extraRanges) {
  for (let cp = start; cp <= end; cp++) extra += String.fromCodePoint(cp);
}
const chars = [...new Set([...glyphList, ...extra])].join('');

if (!fs.existsSync(src)) {
  console.error(`원본 없음: ${src}\n  pnpm add -D pretendard 후 다시 실행하세요.`);
  process.exit(1);
}

const buf = fs.readFileSync(src);
// 가변 폰트: HarfBuzz subset이 기본적으로 fvar(weight 축)를 보존한다.
const out = await subsetFont(buf, chars, { targetFormat: 'woff2' });
fs.writeFileSync(outPath, out);
const pct = (100 - (out.length / buf.length) * 100).toFixed(1);
console.log(
  `PretendardVariable.woff2 (${(buf.length / 1024).toFixed(0)}KB) -> ` +
    `PretendardVariable.subset.woff2 (${(out.length / 1024).toFixed(0)}KB, -${pct}%)`,
);
console.log(`kept ${chars.length} chars (전 weight 포함 Variable)`);
