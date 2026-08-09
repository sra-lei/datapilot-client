import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      // 主服务器代理（Node.js Server）- Core Service
      '/core': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // 业务服务器代理（Python Server）
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
