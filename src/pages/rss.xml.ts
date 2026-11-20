import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';
import { siteConfig } from '../config';
import { getPublishedPosts } from '../utils/posts';
import { absolutizeUrls } from '../utils/rss';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  const site = context.site ?? siteConfig.url;
  // 네이버 "RSS 및 사이트맵 제출": 최신 글은 본문 전체를 RSS 에 담는다.
  // 글 쪽과 같은 HTML(Shiki 하이라이트 포함)을 그려 content:encoded 로 넣는다.
  const container = await AstroContainer.create();
  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const html = await container.renderToString(Content);
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: `/posts/${post.id}/`,
        categories: post.data.tags,
        content: absolutizeUrls(html, site),
      };
    }),
  );
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site,
    items,
  });
}
