/**
 * 类型定义文件
 */

/**
 * 历史记录项目接口
 */
export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

/**
 * 时间范围类型
 */
export type TimeRange = '7d' | '30d' | '90d';

/**
 * 热力图单元格数据接口
 */
export interface HeatmapCell {
  hour: number;
  day: number;
  value: number;
  items: HistoryItem[];
}

/**
 * 热力图提示框位置接口
 */
export interface TooltipPosition {
  x: number;
  y: number;
}