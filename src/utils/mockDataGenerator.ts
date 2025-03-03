/**
 * 模拟数据生成器
 * 用于生成模拟的浏览历史数据，替代Chrome API
 */

import { HistoryItem } from '../types';

// 常见网站域名列表
const popularDomains = [
  'google.com',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'amazon.com',
  'wikipedia.org',
  'reddit.com',
  'netflix.com',
  'linkedin.com',
  'github.com',
  'stackoverflow.com',
  'medium.com',
  'nytimes.com',
  'cnn.com',
  'bbc.com',
  'yahoo.com',
  'twitch.tv',
  'spotify.com',
  'apple.com'
];

// 常见网站标题模板
const titleTemplates = [
  '搜索结果 - {domain}',
  '{domain} - 首页',
  '欢迎访问 {domain}',
  '{domain} | 官方网站',
  '最新消息 - {domain}',
  '{domain} - 登录',
  '个人资料 - {domain}',
  '设置 - {domain}',
  '热门内容 - {domain}',
  '推荐 - {domain}'
];

/**
 * 生成随机整数
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机日期时间戳
 */
function getRandomDate(startDays: number, endDays: number): number {
  const now = Date.now();
  const startTime = now - startDays * 24 * 60 * 60 * 1000;
  const endTime = now - endDays * 24 * 60 * 60 * 1000;
  return getRandomInt(endTime, startTime);
}

/**
 * 生成随机的网站标题
 */
function generateRandomTitle(domain: string): string {
  const template = titleTemplates[getRandomInt(0, titleTemplates.length - 1)];
  return template.replace('{domain}', domain);
}

/**
 * 生成模拟的历史记录数据
 */
export function generateMockHistoryData(count: number = 1000): HistoryItem[] {
  const historyItems: HistoryItem[] = [];
  
  // 生成不同时间段的数据，使热力图更有变化
  for (let i = 0; i < count; i++) {
    const domainIndex = getRandomInt(0, popularDomains.length - 1);
    const domain = popularDomains[domainIndex];
    const visitCount = getRandomInt(1, 50); // 随机访问次数
    
    // 根据一周内的不同时间生成数据，使热力图更有规律
    let lastVisitTime;
    const dayOfWeek = i % 7; // 0-6 代表周日到周六
    const hourOfDay = getRandomInt(0, 23);
    
    // 工作日和周末的访问模式不同
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 工作日
      // 工作日早上9点到晚上6点访问频率更高
      if (hourOfDay >= 9 && hourOfDay <= 18) {
        lastVisitTime = getRandomDate(0, 7); // 最近一周的数据
      } else {
        lastVisitTime = getRandomDate(7, 30); // 较早的数据
      }
    } else { // 周末
      // 周末全天访问频率较为平均
      lastVisitTime = getRandomDate(0, 14);
    }
    
    // 为特定网站增加更多访问量，使热力图有热点
    const isPopularSite = domainIndex < 5; // 前5个是热门网站
    const adjustedVisitCount = isPopularSite ? visitCount * 2 : visitCount;
    
    historyItems.push({
      id: `mock-${i}`,
      url: `https://www.${domain}/page${getRandomInt(1, 10)}`,
      title: generateRandomTitle(domain),
      visitCount: adjustedVisitCount,
      lastVisitTime: lastVisitTime
    });
  }
  
  return historyItems;
}

/**
 * 按时间范围筛选历史数据
 */
export function filterHistoryByTimeRange(data: HistoryItem[], timeRange: string): HistoryItem[] {
  const now = Date.now();
  const timeRangeMap: { [key: string]: number } = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };
  
  return data.filter(item => {
    return item.lastVisitTime > (now - timeRangeMap[timeRange]);
  });
}