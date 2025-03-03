import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      buildEnd() {
        // 确保目标目录存在
        if (!fs.existsSync('dist')) {
          fs.mkdirSync('dist', { recursive: true });
        }
        
        // 复制manifest.json
        if (fs.existsSync('manifest.json')) {
          fs.copyFileSync('manifest.json', 'dist/manifest.json');
          console.log('Manifest file copied successfully');
        }
        
        // 复制图标目录
        if (fs.existsSync('icons')) {
          if (!fs.existsSync('dist/icons')) {
            fs.mkdirSync('dist/icons', { recursive: true });
          }
          
          const icons = fs.readdirSync('icons');
          icons.forEach(icon => {
            fs.copyFileSync(`icons/${icon}`, `dist/icons/${icon}`);
          });
          console.log('Icons copied successfully');
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts')
      },
      output: {
        entryFileNames: chunk => {
          return chunk.name === 'background' ? 'src/[name].js' : '[name].js';
        },
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    sourcemap: false,
    minify: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})