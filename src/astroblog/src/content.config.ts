import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 目录约定：src/content/blog/<lang>/<slug>.md
// entry id 形如 "en/hello-world"，语言与 slug 由 id 推导，frontmatter 无需重复
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog };
