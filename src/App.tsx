import React, { useEffect, useState, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { openDB } from 'idb';
import './App.css';
import Heatmap from './components/Heatmap';
import BookmarkList from './components/BookmarkList';

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

const App: React.FC = () => {
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const workerRef = useRef<Worker>();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 初始化Web Worker
    workerRef.current = new Worker(new URL('./workers/historyAnalyzer.ts', import.meta.url), {
      type: 'module'
    });

    // 加载收藏的网站
    chrome.storage.sync.get(['favorites'], (result) => {
      if (result.favorites) {
        setFavorites(result.favorites);
      }
    });

    // 加载历史数据
    loadHistoryData();

    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  // 当时间范围变化时重新加载数据
  useEffect(() => {
    if (!loading) {
      setLoading(true);
      loadHistoryData();
    }
  }, [timeRange]);

  const loadHistoryData = async () => {
    try {
      const db = await openDB('historyHeatDB', 1);
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const items = await store.getAll();

      // 根据时间范围筛选数据
      const now = Date.now();
      const timeRangeMap: { [key: string]: number } = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000
      };

      const filteredItems = items.filter(item => {
        return item.lastVisitTime > (now - timeRangeMap[timeRange]);
      });

      setHistoryData(filteredItems);
      setLoading(false);
    } catch (error) {
      console.error('Error loading history data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && historyData.length > 0) {
      // 热力图的渲染由Heatmap组件自己管理
    }
  }, [historyData, loading]);

  const handleTooltipChange = (content: string, position: { x: number; y: number }) => {
    setTooltipContent(content);
    setTooltipPosition(position);
  };

  const toggleFavorite = async (domain: string) => {
    const newFavorites = favorites.includes(domain)
      ? favorites.filter(d => d !== domain)
      : [...favorites, domain].slice(0, 10);

    setFavorites(newFavorites);
    await chrome.storage.sync.set({ favorites: newFavorites });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>浏览历史热力图</h1>
        <Select.Root value={timeRange} onValueChange={setTimeRange}>
          <Select.Trigger className="select-trigger">
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Item value="7d">最近一周</Select.Item>
                <Select.Item value="30d">最近一月</Select.Item>
                <Select.Item value="90d">最近三月</Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </header>

      <main className="main">
        <Tabs.Root defaultValue="heatmap">
          <Tabs.List>
            <Tabs.Trigger value="heatmap">热力图</Tabs.Trigger>
            <Tabs.Trigger value="stats">统计</Tabs.Trigger>
            <Tabs.Trigger value="favorites">收藏</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="heatmap">
            {loading ? (
              <div>加载中...</div>
            ) : (
              <Heatmap
                historyData={historyData}
                onTooltipChange={handleTooltipChange}
              />
            )}
            {tooltipContent && (
              <div
                ref={tooltipRef}
                className="heatmap-tooltip"
                style={{
                  left: tooltipPosition.x + 10,
                  top: tooltipPosition.y + 10
                }}
              >
                {tooltipContent.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="stats">
            <div className="stats">
              <h3>浏览统计</h3>
              <p>总访问次数：{historyData.reduce((sum, item) => sum + item.visitCount, 0)}</p>
              <p>独立网站数：{new Set(historyData.map(item => new URL(item.url).hostname)).size}</p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="favorites">
            <BookmarkList
              favorites={favorites}
              historyData={historyData}
              onToggleFavorite={toggleFavorite}
            />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </div>
  );
};

export default App;