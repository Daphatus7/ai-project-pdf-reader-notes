import rss from '@astrojs/rss';
import { getPosts, postUrl } from '../lib/posts';

export async function GET(context) {
  const posts = await getPosts('en');
  return rss({
    title: 'Atlas Notebook Blog',
    description: 'Notes on AI-assisted reading, research workflows, and building Atlas Notebook.',
    site: new URL('/blog/', context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      // @astrojs/rss 的 link 不会自动加 base，postUrl 已含 /blog 前缀
      link: postUrl(post),
    })),
  });
}
