// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// 배포 도메인 (src/config.ts의 SITE_URL과 일치시킬 것)
const SITE = 'https://astro-blog.dev-bestow.workers.dev';

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

  adapter: cloudflare(),
});