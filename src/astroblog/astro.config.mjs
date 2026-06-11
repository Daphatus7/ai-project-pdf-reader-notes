import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://atlasnotebook.com',
  // 博客挂在主站 /blog 路径下，由主站 Caddy 反代到本服务
  base: '/blog',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en-US', zh: 'zh-CN' } },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
