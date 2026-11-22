import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { siteConfig } from '../config';

// 빌드타임에만 실행되는 코드 (정적 엔드포인트). 폰트는 process.cwd() 기준으로 읽는다.
// 폰트는 OG 텍스트에 필요한 글자(한글 음절 전체 + 라틴/자모/구두점)만 남긴
// 서브셋 WOFF. 원본 OTF(각 ~1.5MB) 대비 대폭 축소되어 레포/설치가 가벼워진다.
// 재생성: `node scripts/subset-fonts.mjs` (원본 OTF는 리포에 두지 않으므로 필요 시 Pretendard에서 재취득).
const fontDir = path.join(process.cwd(), 'src/assets/fonts');
const bold = fs.readFileSync(path.join(fontDir, 'Pretendard-Bold.subset.woff'));
const regular = fs.readFileSync(path.join(fontDir, 'Pretendard-Regular.subset.woff'));

const host = new URL(siteConfig.url).host;

export interface OgOptions {
  title: string;
  description?: string;
}

/**
 * 공백으로만 줄을 바꾸는 글 상자 — 본문의 `word-break: keep-all` 과 같은 결과.
 * satori 는 기본(normal)이면 한글 음절 사이("7분/을"), `wordBreak: 'keep-all'` 이어도 숫자와 한글 사이("7/분을")에서 줄을 바꾼다.
 * 그래서 공백으로 나눈 낱말을 하나씩 flex 항목으로 두고 flex-wrap 으로 줄을 바꾼다(항목 안에서는 줄이 바뀌지 않음).
 */
function words(text: string, style: Record<string, unknown>, spaceWidth: number) {
  return {
    type: 'div',
    props: {
      style: { ...style, display: 'flex', flexWrap: 'wrap', columnGap: `${spaceWidth}px` },
      children: text
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({
          type: 'div',
          props: { style: { display: 'flex', whiteSpace: 'nowrap' }, children: word },
        })),
    },
  };
}

/** satori 노드 트리 (JSX 없이 순수 객체로 구성). */
function template({ title, description }: OgOptions) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#0a0a0a',
        padding: '72px',
        fontFamily: 'Pretendard',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '14px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                  },
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontSize: '30px', color: '#a3a3a3', fontWeight: 400 },
                  children: siteConfig.title,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '24px' },
            children: [
              // 줄 높이 85px × 3줄 = 255px 에서 자른다
              words(
                title,
                {
                  fontSize: '68px',
                  fontWeight: 700,
                  color: '#fafafa',
                  lineHeight: 1.25,
                  maxHeight: '255px',
                  overflow: 'hidden',
                },
                18,
              ),
              description
                ? // 줄 높이 42px × 2줄 = 84px 에서 자른다
                  words(
                    description,
                    {
                      fontSize: '30px',
                      fontWeight: 400,
                      color: '#a3a3a3',
                      lineHeight: 1.4,
                      maxHeight: '84px',
                      overflow: 'hidden',
                    },
                    8,
                  )
                : null,
            ].filter(Boolean),
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: '26px', color: '#525252' },
            children: host,
          },
        },
      ],
    },
  };
}

/** 제목/설명으로 1200x630 OG PNG 버퍼를 생성한다. */
export async function renderOgPng(opts: OgOptions): Promise<Buffer> {
  const svg = await satori(template(opts) as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
      { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
    ],
  });
  // satori가 텍스트를 벡터 path로 변환하므로, 래스터화는 이미 CF 빌드에서
  // 검증된 sharp(libvips)로 처리한다. (별도 네이티브 모듈 불필요)
  return sharp(Buffer.from(svg)).png().toBuffer();
}
