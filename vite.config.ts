import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'hot-reload',
      configureServer(server) {
        // 监听文件变化
        server.watcher.on('change', (file) => {
          // 如果是 manifest.json 或 background script 发生变化
          if (file.includes('manifest.json') || file.includes('background.ts')) {
            console.log('Detected changes in core files, triggering extension reload...');
            // 这里可以添加扩展重载逻辑
          }
        });
      }
    },
    {
      name: 'copy-manifest',
      closeBundle() {
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
  server: {
    port: 3000,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      overlay: true
    },
    watch: {
      ignored: ['!**/node_modules/**']
    }
  },
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