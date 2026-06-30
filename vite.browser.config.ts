import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  base: './',
  build: { outDir: 'dist' },
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'shared') }
  },
  define: {
    'process.env.BROWSER_MODE': '"true"',
  },
  server: {
    proxy: {
      '/api/eurostat': {
        target: 'https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1',
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/api\/eurostat/, ''),
      },
    },
  },
});
