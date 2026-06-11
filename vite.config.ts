
  import { defineConfig, loadEnv } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';

  export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, './src/frontend', '');

    return {
      plugins: [react(), tailwindcss()],
      envDir: './src/frontend',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
      build: {
        target: 'esnext',
        outDir: 'build',
      },
      server: {
        port: 3000,
        open: true,
        proxy: {
          // 仅本地 dev 生效：把 /blog 代理到 Astro dev server（cd src/astroblog && npm run dev）
          // 可在 src/frontend/.env 里用 BLOG_DEV_PROXY 覆盖
          // 生产环境与此无关：由主站 Caddy 按 BLOG_UPSTREAM 环境变量反代（Railway 上配置）
          '/blog': env.BLOG_DEV_PROXY || 'http://localhost:4321',
        },
      },
    };
  });