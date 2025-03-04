import chokidar from 'chokidar';
import { WebSocket } from 'ws';

// 监听的文件路径
const watchPaths = [
  'src/**/*',
  'manifest.json',
  'public/**/*'
];

// WebSocket 连接配置
const wsPort = 3000;
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectInterval = 2000; // 2秒

// 创建 WebSocket 连接函数
function connectWebSocket() {
  if (ws) {
    try {
      ws.terminate();
    } catch (e) {
      console.error('Error terminating existing WebSocket:', e);
    }
  }

  ws = new WebSocket(`ws://localhost:${wsPort}`);

  ws.on('error', (error) => {
    console.error('WebSocket connection error:', error);
    
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectInterval/1000} seconds...`);
      setTimeout(connectWebSocket, reconnectInterval);
    } else {
      console.error('Max reconnect attempts reached. Please ensure Vite server is running on port 3000.');
      console.log('You can continue development without hot reload, or restart the process.');
    }
  });

  ws.on('open', () => {
    console.log('WebSocket connection established');
    reconnectAttempts = 0; // 重置重连计数
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    
    // 如果不是主动关闭，尝试重连
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`Connection closed. Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
      setTimeout(connectWebSocket, reconnectInterval);
    }
  });
}

// 初始连接
connectWebSocket();

// 创建文件监听器
const watcher = chokidar.watch(watchPaths, {
  ignored: /(^|[\/\\])\../, // 忽略隐藏文件
  persistent: true
});

// 监听文件变化
watcher.on('change', (path) => {
  console.log(`File ${path} has been changed`);
  
  // 如果是关键文件发生变化，触发重载
  if (path.includes('manifest.json') || path.includes('background.ts')) {
    console.log('Critical file changed, triggering extension reload...');
    // 通过 WebSocket 发送重载消息
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'reload' }));
    } else {
      console.warn('WebSocket not connected. Cannot send reload message.');
    }
  }
});

console.log('Extension hot-reload watcher started...');