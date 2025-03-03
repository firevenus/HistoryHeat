import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5177,
    open: false
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
  publicDir: 'public'
})