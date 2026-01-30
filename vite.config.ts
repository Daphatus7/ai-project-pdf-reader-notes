
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';

  export default defineConfig({
    plugins: [react()],
    envDir: './src/frontend',
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
    },
  });