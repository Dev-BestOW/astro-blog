// 파비콘(public/favicon.svg)을 PNG·ICO 로 만든다 — 구글이 받는 파비콘 형식 목록에 SVG 가 없어서(2026-11-20 korean-seo 스킬 검사).
// 아이콘 모양이 바뀌면 실행: node scripts/generate-favicons.mjs
// - public/favicon-96.png: BaseLayout 의 `<link rel="icon">`(구글 권장 48px 넘게, 네이버 권장 32px 이상)
// - public/favicon.ico: link 를 못 읽는 도구가 찾는 /favicon.ico (32·48px PNG 를 담은 ICO)
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const fromRoot = (path) => new URL(`../${path}`, import.meta.url);
const svg = readFileSync(fromRoot('public/favicon.svg'));

// density 를 크기에 맞춰 올려 SVG 를 벡터 그대로 그린다(작게 그린 뒤 키우면 흐려짐). viewBox 32 기준.
const png = (size) =>
  sharp(svg, { density: (72 * size) / 32 })
    .resize(size, size)
    .png()
    .toBuffer();

/** PNG 를 그대로 담은 ICO(Windows Vista 이후·모든 브라우저가 읽음) */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // 예약
  header.writeUInt16LE(1, 2); // 1 = 아이콘
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // 색 평면
    entry.writeUInt16LE(32, 6); // 픽셀당 비트
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

writeFileSync(fromRoot('public/favicon-96.png'), await png(96));
writeFileSync(
  fromRoot('public/favicon.ico'),
  ico([
    { size: 32, data: await png(32) },
    { size: 48, data: await png(48) },
  ]),
);
