import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// 获取环境变量
const useMockData = process.env.MOCK_DATA === 'true';
console.log('Server MOCK_DATA:', process.env.MOCK_DATA);
console.log('Server useMockData:', useMockData);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5177,
    open: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  },
  build: {
    outDir: 'dist/web',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    },
    assetsDir: 'assets',
    copyPublicDir: true
  },
  publicDir: 'public',
  // 定义环境变量，使其在客户端代码中可用
  define: {
    'import.meta.env.MOCK_DATA': JSON.stringify(process.env.MOCK_DATA)
  }
})