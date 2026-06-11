import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export type Lang = 'en' | 'zh';

export const BASE = '/blog';

export function postLang(post: Post): Lang {
  return post.id.split('/')[0] as Lang;
}

export function postSlug(post: Post): string {
  return post.id.split('/').slice(1).join('/');
}

export function postUrl(post: Post): string {
  const lang = postLang(post);
  const prefix = lang === 'en' ? BASE : `${BASE}/${lang}`;
  return `${prefix}/${postSlug(post)}/`;
}

export function listUrl(lang: Lang): string {
  return lang === 'en' ? `${BASE}/` : `${BASE}/${lang}/`;
}

export async function getPosts(lang: Lang): Promise<Post[]> {
  const posts = await getCollection(
    'blog',
    ({ id, data }) => id.startsWith(`${lang}/`) && (import.meta.env.DEV || !data.draft),
  );
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** 同 slug 的另一语言版本 URL；不存在时退回对方语言的列表页 */
export async function getAlternateUrl(post: Post): Promise<string> {
  const otherLang: Lang = postLang(post) === 'en' ? 'zh' : 'en';
  const slug = postSlug(post);
  const candidates = await getCollection(
    'blog',
    ({ id, data }) => id === `${otherLang}/${slug}` && !data.draft,
  );
  return candidates.length > 0 ? postUrl(candidates[0]) : listUrl(otherLang);
}

export function formatDate(date: Date, lang: Lang): string {
  return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
