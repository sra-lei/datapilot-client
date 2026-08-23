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
      // 业务服务器代理（Python Server）- 旧 CharterMate 服务（兼容保留）
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // Docs-Seeker 服务代理（Python FastAPI，RAG 检索问答，端口 8001）
      // 前端用同源路径 /v1/*，Vite 转发到 docs-seeker（路由本身带 /v1 前缀）
      '/v1': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // Doc-Kit 服务代理（Python FastAPI）
      // 前端用同源路径 /doc-kit/*，Vite 转发到 doc-kit 开发端口 8100
      '/doc-kit': {
        target: 'http://127.0.0.1:8100',
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
