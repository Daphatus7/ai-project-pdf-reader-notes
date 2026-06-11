import rss from '@astrojs/rss';
import { getPosts, postUrl } from '../../lib/posts';

export async function GET(context) {
  const posts = await getPosts('zh');
  return rss({
    title: 'Atlas Notebook 博客',
    description: '关于 AI 辅助阅读、研究工作流以及 Atlas Notebook 开发的笔记。',
    site: new URL('/blog/zh/', context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
    })),
  });
}
