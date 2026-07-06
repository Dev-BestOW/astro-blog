import type { APIRoute } from 'astro';
import { siteConfig } from '~/config';

// 크롤러 전체 허용 + 사이트맵 인덱스 절대 URL 안내.
// siteConfig.url 기반이라 도메인 변경 시 자동 반영된다.
const sitemapUrl = new URL('sitemap-index.xml', siteConfig.url).href;

const body = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
