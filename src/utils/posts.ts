import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 발행된(초안 아님) 글을 최신순으로 반환. draft는 prod 빌드에서만 제외. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** 태그 → 글 개수 맵 (많은 순 정렬된 배열). */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 시리즈 내 정렬: seriesOrder(오름차순) → pubDate(오름차순, 1편 먼저). */
function bySeriesOrder(a: Post, b: Post): number {
  const oa = a.data.seriesOrder ?? Infinity;
  const ob = b.data.seriesOrder ?? Infinity;
  if (oa !== ob) return oa - ob;
  return a.data.pubDate.getTime() - b.data.pubDate.getTime();
}

/** 한 시리즈에 속한 글을 순서대로 반환. */
export async function getSeriesPosts(name: string): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.data.series === name).sort(bySeriesOrder);
}

/** 모든 시리즈 → {이름, 글 수, 순서대로 정렬된 글}. 최신 글이 있는 시리즈부터. */
export async function getAllSeries(): Promise<{ name: string; count: number; posts: Post[] }[]> {
  const posts = await getPublishedPosts();
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const name = post.data.series;
    if (!name) continue;
    const list = groups.get(name) ?? [];
    list.push(post);
    groups.set(name, list);
  }
  return [...groups.entries()]
    .map(([name, list]) => ({ name, count: list.length, posts: [...list].sort(bySeriesOrder) }))
    .sort((a, b) => b.posts[0].data.pubDate.getTime() - a.posts[0].data.pubDate.getTime());
}

/** 글의 시리즈 문맥(전체 편 목록·현재 인덱스·이전/다음). 시리즈 없으면 null. */
export async function getSeriesContext(post: Post): Promise<{
  name: string;
  posts: Post[];
  index: number;
  prev: Post | null;
  next: Post | null;
} | null> {
  const name = post.data.series;
  if (!name) return null;
  const posts = await getSeriesPosts(name);
  const index = posts.findIndex((p) => p.id === post.id);
  if (index === -1) return null;
  return {
    name,
    posts,
    index,
    prev: index > 0 ? posts[index - 1] : null,
    next: index < posts.length - 1 ? posts[index + 1] : null,
  };
}

const WORDS_PER_MINUTE = 200;

/** 한글/영문 혼용 본문의 대략적 읽기 시간(분). */
export function readingTimeMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/```[\s\S]*?```/g, '') // 코드블록 제외
    .replace(/[#>*_`~-]/g, ' ');
  const cjk = (text.match(/[一-鿿가-힣]/g) ?? []).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil((words + cjk / 2) / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
}

export function formatDate(date: Date, locale = 'ko-KR'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
