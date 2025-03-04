/**
 * 背景脚本，处理浏览器扩展的核心功能
 */
import { openDB } from 'idb';

const DB_NAME = 'historyHeatDB';
const DB_VERSION = 1;

// 初始化IndexedDB数据库
const initDB = async () => {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id' });
          store.createIndex('url', 'url');
          store.createIndex('lastVisitTime', 'lastVisitTime');
        }
      }
    });
    return db;
  } catch (error) {
    console.error('初始化数据库失败:', error);
    throw new Error('数据库初始化失败');
  }
};

// 保存要排除的域名列表
let excludedDomains: string[] = [];

// 从存储中加载排除的域名
const loadExcludedDomains = async () => {
  try {
    const result = await chrome.storage.local.get('excludedDomains');
    if (result.excludedDomains) {
      excludedDomains = result.excludedDomains;
      console.log('Loaded excluded domains:', excludedDomains);
    }
  } catch (error) {
    console.error('Error loading excluded domains:', error);
  }
};

// 保存排除的域名到存储
const saveExcludedDomains = async () => {
  try {
    await chrome.storage.local.set({ excludedDomains });
    console.log('Saved excluded domains:', excludedDomains);
  } catch (error) {
    console.error('Error saving excluded domains:', error);
  }
};

// 检查URL是否有效
const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

// 同步历史时过滤排除的域名
const syncHistory = async () => {
  try {
    const db = await initDB();
    const historyItems = await chrome.history.search({
      text: '',
      startTime: 0,
      maxResults: 10000
    });
  
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
  
    let skippedCount = 0;
    let savedCount = 0;
  
    for (const item of historyItems) {
      try {
        // 检查URL是否有效
        if (item.url && isValidUrl(item.url)) {
          // 检查域名是否在排除列表中
          const url = new URL(item.url);
          const domain = url.hostname;
          
          if (!excludedDomains.includes(domain)) {
            await store.put({
              id: item.id,
              url: item.url,
              title: item.title || domain,
              visitCount: item.visitCount || 1,
              lastVisitTime: item.lastVisitTime || Date.now()
            });
            savedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (e) {
        // 忽略无效URL
        console.log('Skipping invalid URL:', item.url);
        skippedCount++;
      }
    }
  
    await tx.done;
    console.log(`同步历史完成：保存 ${savedCount} 项，跳过 ${skippedCount} 项`);
  } catch (error) {
    console.error('同步历史失败:', error);
    throw error;
  }
};

// 初始化
const init = async () => {
  await loadExcludedDomains();
  await syncHistory();
};

// 监听消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SYNC_HISTORY' || message.type === 'getHistory') {
    syncHistory()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: String(error) }));
    return true;
  }
  
  // 处理打开URL请求
  if (message.type === 'OPEN_URL' && message.url) {
    try {
      console.log('Background: 收到打开URL请求', message.url);
      chrome.tabs.create({ url: message.url }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('打开URL失败:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('成功打开URL:', message.url, '标签ID:', tab?.id);
          sendResponse({ success: true, tabId: tab?.id });
        }
      });
    } catch (error) {
      console.error('打开URL时出错:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }
  
  // 处理排除域名请求
  if (message.type === 'EXCLUDE_DOMAIN' && message.domain) {
    try {
      // 添加到排除列表
      if (!excludedDomains.includes(message.domain)) {
        excludedDomains.push(message.domain);
        saveExcludedDomains()
          .then(() => {
            // 重新同步历史以应用排除
            return syncHistory();
          })
          .then(() => {
            sendResponse({ success: true, message: `成功排除域名: ${message.domain}` });
          })
          .catch(error => {
            sendResponse({ success: false, error: String(error) });
          });
      } else {
        sendResponse({ success: true, message: `域名已经在排除列表中: ${message.domain}` });
      }
    } catch (error) {
      console.error('Error excluding domain:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }
  
  // 处理添加书签请求
  if (message.type === 'ADD_BOOKMARK' && message.url) {
    try {
      chrome.bookmarks.create({
        title: message.title || message.url,
        url: message.url
      }, (bookmark) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, bookmark });
        }
      });
    } catch (error) {
      console.error('Error adding bookmark:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }
});

// 初始化
init();