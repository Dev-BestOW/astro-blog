import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 발행된(초안 아님) 글을 최신순으로 반환. draft는 prod 빌드에서만 제외. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  return posts.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
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

const WORDS_PER_MINUTE = 200;

/** 한글/영문 혼용 본문의 대략적 읽기 시간(분). */
export function readingTimeMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/```[\s\S]*?```/g, '') // 코드블록 제외
    .replace(/[#>*_`~\-]/g, ' ');
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
