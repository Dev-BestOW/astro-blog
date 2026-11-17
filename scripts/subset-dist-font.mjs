/**
 * 빌드 뒤(dist) 본문 웹폰트를 "사이트에 실제로 쓰인 글자 + 쓰는 굵기"만 남게 다시 줄인다.
 *
 * src/assets/fonts/PretendardVariable.subset.woff2(상용 한글 2,780자·전 굵기, 약 630 kB)는 개발용 원본이고,
 * 배포본은 모든 HTML·XML 에 나온 글자(+ ASCII·자주 쓰는 기호)와 굵기 400~700 만 남긴다(약 110 kB).
 * 새 글로 글자가 늘면 다음 빌드에서 자동으로 들어간다.
 *
 * 줄인 파일은 **내용 해시로 이름을 새로 짓고** CSS 의 참조를 바꾼다. Astro 가 붙인 해시는 원본 파일 기준이라
 * 그대로 두면 글자가 늘어도 이름이 같아 브라우저가 옛(글자가 모자란) 파일을 캐시에서 계속 쓴다.
 *
 * package.json 의 build: astro build && node scripts/subset-dist-font.mjs && pagefind --site dist
 * 문제가 있으면(글꼴·참조를 못 찾음) 빌드를 실패시킨다 — 조용히 넘어가면 큰 글꼴이 그대로 배포된다.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const dist = path.resolve('dist');
const assets = path.join(dist, '_astro');
// global.css 의 @font-face font-weight 와 맞춘다(쓰는 굵기: normal·medium·semibold·bold)
const weight = { min: 400, max: 700 };

const fail = (message) => {
  console.error(`[subset-dist-font] ${message}`);
  process.exit(1);
};

const fonts = fs
  .readdirSync(assets)
  .filter((f) => /^PretendardVariable\.subset\..+\.woff2$/.test(f));
if (fonts.length !== 1)
  fail(`dist/_astro 에 본문 글꼴이 하나여야 하는데 ${fonts.length}개예요: ${fonts.join(', ')}`);
const [fontName] = fonts;

const files = fs.readdirSync(dist, { recursive: true }).map((f) => path.join(dist, String(f)));
// 글자 출처: 모든 쪽 HTML(인라인 스크립트의 검색 UI 문구 포함)과 RSS·사이트맵
let text = '';
for (const file of files.filter((f) => /\.(html|xml)$/.test(f)))
  text += fs.readFileSync(file, 'utf8');
const always = [
  [0x20, 0x7e], // ASCII
  [0x2010, 0x2027], // 대시·따옴표·…
  [0x20a9, 0x20a9], // ₩
  [0x2190, 0x2199], // 화살표
  [0x3130, 0x3163], // 한글 호환 자모(ㅋㅋ·ㅠㅠ)
];
let extra = '';
for (const [start, end] of always)
  for (let cp = start; cp <= end; cp++) extra += String.fromCodePoint(cp);
const chars = [...new Set(text + extra)].join('');

const source = fs.readFileSync(path.join(assets, fontName));
const subset = await subsetFont(source, chars, {
  targetFormat: 'woff2',
  variationAxes: { wght: weight },
});
const hash = createHash('sha256').update(subset).digest('base64url').slice(0, 8);
const newName = `PretendardVariable.subset.${hash}.woff2`;

// 참조 바꾸기(Astro 가 만든 CSS — 인라인된 경우를 위해 HTML 도 본다)
let replaced = 0;
for (const file of files.filter((f) => /\.(css|html)$/.test(f))) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(fontName)) continue;
  fs.writeFileSync(file, content.replaceAll(fontName, newName));
  replaced++;
}
if (replaced === 0) fail(`${fontName} 를 참조하는 CSS·HTML 을 찾지 못했어요`);

fs.rmSync(path.join(assets, fontName));
fs.writeFileSync(path.join(assets, newName), subset);
const kb = (n) => `${Math.round(n / 1024)} kB`;
const hangul = [...chars].filter((c) => c >= '가' && c <= '힣').length;
console.log(
  `[subset-dist-font] ${fontName} (${kb(source.length)}) → ${newName} (${kb(subset.length)}), ` +
    `글자 ${[...chars].length}개(한글 ${hangul}), 굵기 ${weight.min}~${weight.max}, 참조 ${replaced}곳`,
);
