import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * 热力图组件的属性接口
 * @property historyData - 浏览历史数据数组
 * @property onTooltipChange - 当鼠标悬停在热力图上时，更新提示框内容和位置的回调函数
 * @property onToggleFavorite - 可选，当用户右键点击域名时触发收藏/取消收藏的回调函数
 */
interface HeatmapProps {
  historyData: HistoryItem[];
  onTooltipChange: (content: string, position: { x: number; y: number }) => void;
  onToggleFavorite?: (domain: string) => void;
}

import { HistoryItem } from '../types';

/**
 * 域名信息接口，用于按域名聚合历史数据
 * @property domain - 网站域名
 * @property visits - 该域名的总访问次数
 * @property items - 属于该域名的所有历史记录项
 */
interface DomainInfo {
  domain: string;
  visits: number;
  items: HistoryItem[];
}

/**
 * D3层次结构数据接口，用于构建树状图
 * @property name - 根节点名称
 * @property domain - 域名
 * @property visits - 访问次数
 * @property items - 历史记录项
 */
interface HierarchyDatum {
  name: string;
  domain?: string;
  visits?: number;
  items?: HistoryItem[];
  children?: HierarchyDatum[];
}

/**
 * 树状图节点类型，D3的矩形层次节点，包含布局信息
 */
type TreemapNode = d3.HierarchyRectangularNode<HierarchyDatum>;

/**
 * 热力图组件
 * 将浏览历史数据可视化为热力图，按域名分组并根据访问频率着色
 */
const Heatmap: React.FC<HeatmapProps> = ({ historyData, onTooltipChange, onToggleFavorite }) => {
  // 引用DOM元素的容器
  const heatmapRef = useRef<HTMLDivElement>(null);

  // 当历史数据或回调函数变化时重新渲染热力图
  useEffect(() => {
    if (historyData.length > 0 && heatmapRef.current) {
      renderHeatmap();
    }
  }, [historyData, onTooltipChange, onToggleFavorite]);

  /**
   * 渲染热力图的主函数
   * 处理数据分组、创建D3树状图、添加交互和视觉效果
   */
  const renderHeatmap = () => {
    // 清除现有内容，准备重新渲染
    d3.select(heatmapRef.current).selectAll('*').remove();

    // 设置图表尺寸和边距
    const margin = { top: 20, right: 40, bottom: 30, left: 40 };
    const containerWidth = heatmapRef.current?.clientWidth || 800;
    const containerHeight = heatmapRef.current?.clientHeight || 600;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // 创建SVG容器
    const svg = d3.select(heatmapRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 添加圆角矩形背景
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#f5f5f5')  // 浅色背景
      .attr('rx', 8)  // 水平圆角
      .attr('ry', 8);  // 垂直圆角

    // 按域名分组数据，计算每个域名的总访问量
    const domainData = new Map<string, DomainInfo>();
    historyData.forEach(item => {
      try {
        const domain = new URL(item.url).hostname;
        if (!domainData.has(domain)) {
          domainData.set(domain, {
            domain,
            visits: 0,
            items: []
          });
        }
        const domainInfo = domainData.get(domain)!;
        domainInfo.visits += item.visitCount;
        domainInfo.items.push(item);
      } catch (e) {
        // 忽略无效URL
      }
    });

    // 将Map转换为数组并按访问量降序排序
    const sortedDomains = Array.from(domainData.values())
      .sort((a, b) => b.visits - a.visits);

    // 计算所有域名的总访问量，用于计算百分比
    const totalVisits = sortedDomains.reduce((sum, d) => sum + d.visits, 0);

    // 创建D3树状图布局
    const treemapLayout = d3.treemap<HierarchyDatum>()
      .size([width, height])
      .paddingOuter(3)
      .paddingInner(2)
      .round(true);

    // 准备层次数据结构
    const hierarchyData = { name: 'root', children: sortedDomains.map(d => ({ name: d.domain, visits: d.visits, items: d.items })) };
    const root = d3.hierarchy(hierarchyData)
      .sum(d => (d as any).visits || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // 应用树状图布局算法
    const rootWithLayout = treemapLayout(root as d3.HierarchyNode<HierarchyDatum>);

    // 创建颜色比例尺，从绿色到红色，表示访问频率从低到高
    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateRgbBasis([
        '#00ff00',  // 绿色（低频率）
        '#7cfc00',
        '#adff2f',
        '#ffff00',  // 黄色（中频率）
        '#ffa500',
        '#ff4500',
        '#ff0000'   // 红色（高频率）
      ]))
      .domain([0, sortedDomains[0]?.visits || 1]);  // 设置比例尺范围，从0到最高访问量

    // 创建表示每个域名的节点组
    const nodes = svg.selectAll<SVGGElement, TreemapNode>('.domain-node')
      .data(rootWithLayout.leaves())
      .enter()
      .append('g')
      .attr('class', 'domain-node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // 添加矩形
    nodes.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const data = d.data as unknown as DomainInfo;
        return colorScale(data.visits);
      })
      .attr('ry', 4)
      .attr('stroke', d => {
        const data = d.data as unknown as DomainInfo;
        return d3.rgb(colorScale(data.visits)).darker(0.5).toString();
      })
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.8)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('click', function(this: SVGElement, _event: MouseEvent, d: TreemapNode) {
        const data = d.data as unknown as DomainInfo;
        const url = data.items[0]?.url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      })
      .on('contextmenu', function(this: SVGElement, event: MouseEvent, d: TreemapNode) {
        event.preventDefault();
        const data = d.data as unknown as DomainInfo;
        if (onToggleFavorite) {
          onToggleFavorite(data.domain);
        }
      })
      .on('mouseover', function(this: SVGElement, event: MouseEvent, d: TreemapNode) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke-width', 3)
          .attr('stroke-opacity', 1)
          .attr('transform', 'scale(1.03)');

        const data = d.data as unknown as DomainInfo;
        const percentage = ((data.visits / totalVisits) * 100).toFixed(1);
        const lastVisit = new Date(Math.max(...data.items.map(item => item.lastVisitTime)));
        const topUrls = data.items
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5)
          .map(item => {
            const title = item.title || new URL(item.url).pathname;
            return `• ${title.length > 40 ? title.slice(0, 37) + '...' : title} (${item.visitCount}次)`;
          })
          .join('\n');

        onTooltipChange(
          `📊 ${data.domain}\n` +
          `访问量：${data.visits.toLocaleString()}次 (${percentage}%)\n` +
          `最近访问：${lastVisit.toLocaleString()}\n\n` +
          `热门页面：\n${topUrls}\n\n` +
          `🖱️ 点击访问网站 | 右键收藏`,
          { x: event.pageX, y: event.pageY }
        );
      })
      .on('mouseout', function(this: SVGElement) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.9)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.8)
          .attr('transform', 'scale(1)');

        onTooltipChange('', { x: 0, y: 0 });
      })
      .on('mousemove', function(this: SVGElement, event: MouseEvent, d: TreemapNode) {
        const data = d.data as unknown as DomainInfo;
        const percentage = ((data.visits / totalVisits) * 100).toFixed(1);
        const lastVisit = new Date(Math.max(...data.items.map(item => item.lastVisitTime)));
        const topUrls = data.items
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5)
          .map(item => {
            const title = item.title || new URL(item.url).pathname;
            return `• ${title.length > 40 ? title.slice(0, 37) + '...' : title} (${item.visitCount}次)`;
          })
          .join('\n');

        onTooltipChange(
          `📊 ${data.domain}\n` +
          `访问量：${data.visits.toLocaleString()}次 (${percentage}%)\n` +
          `最近访问：${lastVisit.toLocaleString()}\n\n` +
          `热门页面：\n${topUrls}\n\n` +
          `🖱️ 点击访问网站 | 右键收藏`,
          { x: event.pageX, y: event.pageY }
        );
      });

    // 为较大的方块添加域名文本标签
    nodes
      .filter((d: TreemapNode) => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)  // 只为足够大的方块添加标签
      .append('text')
      .attr('x', (d: TreemapNode) => d.x0 + 5)
      .attr('y', (d: TreemapNode) => d.y0 + 20)
      .text((d: TreemapNode) => d.data.domain || '')
      .attr('class', 'treemap-label');
  };

  return (
    <div ref={heatmapRef} className="heatmap-container" />
  );
};

export default Heatmap;
