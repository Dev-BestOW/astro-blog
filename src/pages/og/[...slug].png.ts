import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts } from '../../utils/posts';
import { siteConfig } from '../../config';
import { renderOgPng, type OgOptions } from '../../lib/og';

export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  const routes = posts.map((post) => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      description: post.data.description,
    } satisfies OgOptions,
  }));

  // 사이트 기본 OG (홈/태그 등에서 사용)
  routes.push({
    params: { slug: 'default' },
    props: { title: siteConfig.title, description: siteConfig.description },
  });

  return routes;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgPng(props as OgOptions);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
