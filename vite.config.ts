import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      // 主服务器代理（Node.js Server）- Core Service
      '/core': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // 业务服务器代理（Python Server）
      '/api/v1': {
        target: 'http://localhost:8000',
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
