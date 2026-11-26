// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeTableWrap from './src/lib/rehype-table-wrap.mjs';
import { withPostLastmod } from './src/lib/sitemap-lastmod.mjs';

// 배포 도메인 (src/config.ts의 SITE_URL과 일치시킬 것)
const SITE = 'https://jiwon-seok.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  // 사이트맵: 글 쪽에만 lastmod(updatedDate ?? pubDate) — src/lib/sitemap-lastmod.mjs
  integrations: [
    mdx(),
    sitemap({
      serialize: withPostLastmod('./src/content/posts'),
      // 사이트 내부 검색 쪽은 검색 대상이 아니다(search.astro 의 noindex 와 함께)
      filter: (page) => new URL(page).pathname !== '/search/',
    }),
  ],
  markdown: {
    // 본문 표를 가로 스크롤 상자로 감싼다(좁은 화면 넘침 방지). MDX 도 이 설정을 이어받는다.
    rehypePlugins: [rehypeTableWrap],
    shikiConfig: {
      // 고대비 테마 — 기본 github-light/dark 는 주석·일부 토큰 대비가 4.5:1 미만(axe color-contrast)
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
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
