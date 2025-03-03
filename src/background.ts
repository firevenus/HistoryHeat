import { openDB } from 'idb';

const DB_NAME = 'historyHeatDB';
const DB_VERSION = 1;

const initDB = async () => {
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
};

const syncHistory = async () => {
  const db = await initDB();
  const historyItems = await chrome.history.search({
    text: '',
    startTime: 0,
    maxResults: 10000
  });

  const tx = db.transaction('history', 'readwrite');
  const store = tx.objectStore('history');

  for (const item of historyItems) {
    await store.put({
      id: item.id,
      url: item.url,
      title: item.title,
      visitCount: item.visitCount,
      lastVisitTime: item.lastVisitTime
    });
  }

  await tx.done;
};

// 监听消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SYNC_HISTORY' || message.type === 'getHistory') {
    syncHistory()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 初始同步
syncHistory();