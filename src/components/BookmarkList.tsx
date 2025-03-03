import React from 'react';

interface BookmarkListProps {
  favorites: string[];
  historyData: HistoryItem[];
  onToggleFavorite: (domain: string) => void;
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ favorites, historyData, onToggleFavorite }) => {
  return (
    <div className="favorites-list">
      {favorites.map(domain => {
        const stats = historyData
          .filter(item => {
            try {
              return new URL(item.url).hostname === domain;
            } catch {
              return false;
            }
          })
          .reduce((acc, item) => ({
            visitCount: acc.visitCount + item.visitCount,
            title: item.title || acc.title
          }), { visitCount: 0, title: '' });

        return (
          <div key={domain} className="favorite-item">
            <div className="favorite-info">
              <strong>{stats.title || domain}</strong>
              <div className="visit-count">访问次数: {stats.visitCount}</div>
            </div>
            <button
              className="favorite-icon"
              onClick={() => onToggleFavorite(domain)}
              title={favorites.includes(domain) ? '取消收藏' : '添加收藏'}
            >
              🔥
            </button>
          </div>
        );
      })}
      {favorites.length === 0 && (
        <div className="empty-favorites">
          <p>暂无收藏网站</p>
          <p className="tip">浏览网站时点击🔥图标即可添加收藏</p>
        </div>
      )}
    </div>
  );
};

export default BookmarkList;