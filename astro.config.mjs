// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// TODO(M4): 실제 배포 도메인으로 교체 (src/config.ts의 SITE_URL과 일치시킬 것)
const SITE = 'https://astro-blog.pages.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
