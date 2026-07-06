import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteConfig } from '../config';
import { getPublishedPosts } from '../utils/posts';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
