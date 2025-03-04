interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

export async function fetchBrowserHistory(): Promise<HistoryItem[]> {
  return new Promise((resolve, reject) => {
    chrome.history.search(
      { text: '', startTime: 0, maxResults: 10000 },
      (historyItems) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const formattedHistory: HistoryItem[] = historyItems.map(item => ({
          id: item.id || '',
          url: item.url || '',
          title: item.title || '',
          visitCount: item.visitCount || 0,
          lastVisitTime: item.lastVisitTime || 0
        }));

        resolve(formattedHistory);
      }
    );
  });
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

export function analyzeDomainStats(historyData: HistoryItem[]): DomainStats[] {
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

export function analyzeTimeSlots(historyData: HistoryItem[]): TimeSlotStats[] {
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

export function filterHistoryByTimeRange(historyData: HistoryItem[], timeRange: string): HistoryItem[] {
  const now = Date.now();
  const timeRangeMap: { [key: string]: number } = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };

  return historyData.filter(item => {
    return item.lastVisitTime > (now - timeRangeMap[timeRange]);
  });
}