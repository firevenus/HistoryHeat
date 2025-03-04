import { resolve } from 'path';
import fs from 'fs';

export const devConfig = {
  // 开发服务器配置
  server: {
    port: 3000,
    hmr: true,
    watch: {
      // 监听这些文件的变化
      include: [
        'src/**',
        'manifest.json'
      ]
    }
  },

  // 模拟数据配置
  mock: {
    // 是否启用模拟数据
    enabled: true,
    // 模拟数据的数量
    historyCount: 1000,
    // 模拟数据的时间范围（天）
    dateRange: 30
  },

  // 浏览器扩展配置
  extension: {
    // 扩展重载延迟（毫秒）
    reloadDelay: 1000,
    // 自动重载触发文件
    reloadTriggerFiles: [
      'manifest.json',
      'src/background.ts',
      'src/content.ts'
    ]
  },

  // 构建输出配置
  build: {
    outDir: 'dist',
    sourcemap: true
  }
};

// 辅助函数：检查文件是否需要触发重载
export const shouldTriggerReload = (filePath) => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return devConfig.extension.reloadTriggerFiles.some(triggerFile =>
    normalizedPath.includes(triggerFile)
  );
};

// 辅助函数：重载扩展
export const reloadExtension = async () => {
  console.log('🔄 重新加载扩展...');
  // 延迟执行，确保文件已经被正确构建
  await new Promise(resolve => setTimeout(resolve, devConfig.extension.reloadDelay));
  
  // 这里可以添加Chrome扩展重载的具体实现
  if (process.env.NODE_ENV === 'development') {
    // 可以通过Chrome扩展API或其他方式触发重载
    console.log('✅ 扩展重载完成');
  }
};