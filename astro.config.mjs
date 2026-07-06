// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// 배포 도메인 (src/config.ts의 SITE_URL과 일치시킬 것)
const SITE = 'https://jiwon-seok.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
      // 코드블록 <pre>에 data-language를 심는다(언어 라벨 + 복사 버튼용, 클라이언트 스크립트가 사용).
      transformers: [
        {
          pre(node) {
            const lang = this.options?.lang;
            if (lang && lang !== 'text' && lang !== 'plaintext') {
              node.properties['data-language'] = lang;
            }
          },
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
