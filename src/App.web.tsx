import React, { useEffect, useState, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import Select from 'react-select';
import './App.css';
import Heatmap from './components/Heatmap';
import { filterHistoryByTimeRange } from './utils/mockDataGenerator';
import { HistoryItem, TimeRange, TooltipPosition } from './types';
import { useLocale } from './contexts/LocaleContext';

// 环境变量检测的更安全方式
const useMockData = process.env.NODE_ENV === 'development' || process.env.MOCK_DATA === 'true';
console.log('Server useMockData:', useMockData);

const timeRangeOptions = [
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: '90d', label: '最近90天' }
];

const languageOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
  { value: 'uk', label: 'Українська' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ru', label: 'Русский' }
];

const App: React.FC = () => {
  const { messages, locale, setLocale } = useLocale();
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 加载模拟数据
    loadHistoryData();
    
    // 从localStorage加载收藏的网站
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
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
      if (useMockData) {
        // 使用模拟数据进行测试
        const { generateMockHistoryData } = await import('./utils/mockDataGenerator');
        const mockData = generateMockHistoryData(1000);
        console.log('Generated mock data:', mockData.length, 'items');
        
        // 根据时间范围筛选数据
        const filteredData = filterHistoryByTimeRange(mockData, timeRange);
        console.log('Filtered data for', timeRange, ':', filteredData.length, 'items');
        
        setHistoryData(filteredData);
      } else {
        // TODO: 加载真实数据
        console.log('Real data loading not implemented yet');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading history data:', error);
      setLoading(false);
    }
  };

  const handleTooltipChange = (content: string, position: TooltipPosition) => {
    setTooltipContent(content);
    setTooltipPosition(position);
  };

  const toggleFavorite = (domain: string) => {
    const newFavorites = favorites.includes(domain)
      ? favorites.filter(d => d !== domain)
      : [...favorites, domain].slice(0, 10);

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  // 计算统计数据
  const totalVisits = historyData.reduce((sum, item) => sum + item.visitCount, 0);
  const uniqueSites = new Set(historyData.map(item => new URL(item.url).hostname)).size;

  // 获取热门网站
  const getTopSites = () => {
    const domainMap = new Map<string, number>();
    
    historyData.forEach(item => {
      try {
        const domain = new URL(item.url).hostname;
        domainMap.set(domain, (domainMap.get(domain) || 0) + item.visitCount);
      } catch (e) {
        // 忽略无效URL
      }
    });
    
    return Array.from(domainMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const topSites = getTopSites();

  return (
    <div className="app">
      <header className="header">
        <div className="header-left"></div>
        <div className="header-center">
          <h1>{messages.title}</h1>
        </div>
        <div className="header-right">
          <Select
            className="time-range-select"
            value={timeRangeOptions.find(option => option.value === timeRange)}
            onChange={(option) => setTimeRange((option as any).value as TimeRange)}
            options={timeRangeOptions}
            isSearchable={false}
          />
          <Select
            className="language-select"
            value={languageOptions.find(option => option.value === locale)}
            onChange={(option) => setLocale((option as any).value)}
            options={languageOptions}
            isSearchable={false}
          />
        </div>
      </header>

      <main className="main">
        <Tabs.Root defaultValue="heatmap">
          <Tabs.List className="tabs-list">
            <Tabs.Trigger className="tab-trigger" value="heatmap">{messages.tabs.heatmap}</Tabs.Trigger>
            <Tabs.Trigger className="tab-trigger" value="stats">{messages.tabs.stats}</Tabs.Trigger>
            <Tabs.Trigger className="tab-trigger" value="topsites">{messages.timeRange["30d"]}</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="heatmap">
            {loading ? (
              <div className="loading">Loading...</div>
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
              <h3>{messages.stats.title}</h3>
              <p>{messages.stats.totalVisits}: {totalVisits}</p>
              <p>{messages.stats.uniqueSites}: {uniqueSites}</p>
              <p>{messages.timeRange[timeRange]}</p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="topsites">
            <div className="stats">
              <h3>Popular Sites</h3>
              <div className="top-sites-list">
                {topSites.map(([domain, count], index) => (
                  <div key={domain} className="top-site-item">
                    <span className="top-site-rank">{index + 1}</span>
                    <span className="top-site-domain">{domain}</span>
                    <span className="top-site-count">{count} visits</span>
                    <button 
                      className="favorite-button"
                      onClick={() => toggleFavorite(domain)}
                    >
                      {favorites.includes(domain) ? '★' : '☆'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </main>
      
      <footer className="footer">
        <p className="font-credit">This site uses Mi Sans Global font</p>
      </footer>
    </div>
  );
};

export default App;