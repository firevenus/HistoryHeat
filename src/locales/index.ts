export const locales = {
  zh: {
    title: '览迹',
    timeRange: {
      '7d': '最近7天',
      '30d': '最近30天',
      '90d': '最近90天'
    },
    tabs: {
      heatmap: '热力图',
      stats: '统计',
      favorites: '收藏'
    },
    stats: {
      title: '浏览统计',
      totalVisits: '总访问次数',
      uniqueSites: '独立网站数'
    },
    loading: '加载中...',
    visits: '访问次数',
    popularPages: '热门页面',
    bookmarks: {
      empty: '暂无收藏网站',
      tip: '浏览网站时点击🔥图标即可添加收藏'
    },
    switchLanguage: '切换语言'
  },
  en: {
    title: 'History Heat',
    timeRange: {
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days'
    },
    tabs: {
      heatmap: 'Heatmap',
      stats: 'Statistics',
      favorites: 'Favorites'
    },
    stats: {
      title: 'Browsing Statistics',
      totalVisits: 'Total Visits',
      uniqueSites: 'Unique Sites'
    },
    loading: 'Loading...',
    visits: 'visits',
    popularPages: 'Popular Pages',
    bookmarks: {
      empty: 'No bookmarks yet',
      tip: 'Click 🔥 icon while browsing to add bookmarks'
    },
    switchLanguage: 'Switch Language'
  },
  ko: {
    title: '히스토리 히트',
    timeRange: {
      '7d': '최근 7일',
      '30d': '최근 30일',
      '90d': '최근 90일'
    },
    tabs: {
      heatmap: '히트맵',
      stats: '통계',
      favorites: '즐겨찾기'
    },
    stats: {
      title: '브라우징 통계',
      totalVisits: '총 방문 횟수',
      uniqueSites: '고유 사이트 수'
    },
    loading: '로딩 중...',
    visits: '방문',
    popularPages: '인기 페이지',
    bookmarks: {
      empty: '아직 북마크가 없습니다',
      tip: '브라우징 중 🔥 아이콘을 클릭하여 북마크를 추가하세요'
    },
    switchLanguage: '언어 전환'
  },
  ja: {
    title: 'ヒストリーヒート',
    timeRange: {
      '7d': '過去7日間',
      '30d': '過去30日間',
      '90d': '過去90日間'
    },
    tabs: {
      heatmap: 'ヒートマップ',
      stats: '統計',
      favorites: 'お気に入り'
    },
    stats: {
      title: 'ブラウジング統計',
      totalVisits: '総訪問回数',
      uniqueSites: 'ユニークサイト数'
    },
    loading: '読み込み中...',
    visits: '訪問',
    popularPages: '人気ページ',
    bookmarks: {
      empty: 'ブックマークはまだありません',
      tip: 'ブラウジング中に🔥アイコンをクリックしてブックマークを追加'
    },
    switchLanguage: '言語を切り替える'
  }
};

export type Locale = keyof typeof locales;
export type LocaleMessages = typeof locales.en;