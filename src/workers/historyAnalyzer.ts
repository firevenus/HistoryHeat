// Web Worker for analyzing history data

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

interface DomainStats {
  domain: string;
  visitCount: number;
  lastVisit: number;
  title: string;
}

interface TimeSlotStats {
  hour: number;
  day: number;
  visits: Array<{
    url: string;
    title: string;
    visitCount: number;
  }>;
}

self.onmessage = async (e: MessageEvent) => {
  const { historyData } = e.data;

  // 分析域名访问统计
  const domainStats = analyzeDomainStats(historyData);

  // 分析时段访问统计
  const timeSlotStats = analyzeTimeSlots(historyData);

  // 发送分析结果回主线程
  self.postMessage({
    domainStats,
    timeSlotStats
  });
};

function analyzeDomainStats(historyData: HistoryItem[]): DomainStats[] {
  const domainMap = new Map<string, DomainStats>();

  historyData.forEach(item => {
    try {
      const url = new URL(item.url);
      const domain = url.hostname;

      if (!domainMap.has(domain)) {
        domainMap.set(domain, {
          domain,
          visitCount: 0,
          lastVisit: 0,
          title: item.title
        });
      }

      const stats = domainMap.get(domain)!;
      stats.visitCount += item.visitCount;
      stats.lastVisit = Math.max(stats.lastVisit, item.lastVisitTime);
    } catch (error) {
      console.error('Invalid URL:', item.url);
    }
  });

  return Array.from(domainMap.values())
    .sort((a, b) => b.visitCount - a.visitCount);
}

function analyzeTimeSlots(historyData: HistoryItem[]): TimeSlotStats[] {
  const timeSlotMap = new Map<string, TimeSlotStats>();

  historyData.forEach(item => {
    const date = new Date(item.lastVisitTime);
    const hour = date.getHours();
    const day = date.getDay();
    const key = `${day}-${hour}`;

    if (!timeSlotMap.has(key)) {
      timeSlotMap.set(key, {
        hour,
        day,
        visits: []
      });
    }

    const slot = timeSlotMap.get(key)!;
    const existingVisit = slot.visits.find(v => v.url === item.url);

    if (existingVisit) {
      existingVisit.visitCount += item.visitCount;
    } else {
      slot.visits.push({
        url: item.url,
        title: item.title,
        visitCount: item.visitCount
      });
    }
  });

  return Array.from(timeSlotMap.values())
    .map(slot => ({
      ...slot,
      visits: slot.visits
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 5)
    }));
}