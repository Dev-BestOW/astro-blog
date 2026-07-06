import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { siteConfig } from '../config';

// 빌드타임에만 실행되는 코드 (정적 엔드포인트). 폰트는 process.cwd() 기준으로 읽는다.
const fontDir = path.join(process.cwd(), 'src/assets/fonts');
const bold = fs.readFileSync(path.join(fontDir, 'Pretendard-Bold.otf'));
const regular = fs.readFileSync(path.join(fontDir, 'Pretendard-Regular.otf'));

const host = new URL(siteConfig.url).host;

export interface OgOptions {
  title: string;
  description?: string;
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
              {
                type: 'div',
                props: {
                  style: {
                    display: 'block',
                    fontSize: '68px',
                    fontWeight: 700,
                    color: '#fafafa',
                    lineHeight: 1.25,
                    maxHeight: '255px',
                    overflow: 'hidden',
                    lineClamp: 3,
                  },
                  children: title,
                },
              },
              description
                ? {
                    type: 'div',
                    props: {
                      style: {
                        display: 'block',
                        fontSize: '30px',
                        fontWeight: 400,
                        color: '#a3a3a3',
                        lineHeight: 1.4,
                        maxHeight: '84px',
                        overflow: 'hidden',
                        lineClamp: 2,
                      },
                      children: description,
                    },
                  }
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
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return Buffer.from(resvg.render().asPng());
}
