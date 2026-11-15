import type { APIRoute } from 'astro';
import { siteConfig } from '~/config';

// 광고 판매자 확인 파일(ads.txt, IAB). AdSense 게시자 ID 가 있을 때만 그 줄을 넣는다.
// f08c47fec0942fa0 은 Google 의 인증 기관 ID 로, AdSense 가 안내하는 줄 그대로다.
// 게시자 ID 가 없으면 주석만 있는 파일 — 광고 판매자가 없다는 뜻이라 무해하다.
const client = siteConfig.ads.adsenseClient;
const body = client
  ? `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
  : '# 광고 판매자 없음\n';

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
