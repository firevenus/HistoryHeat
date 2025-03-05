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

/**
 * 浏览历史项目的接口
 * @property id - 历史记录的唯一标识符
 * @property url - 访问的URL
 * @property title - 页面标题
 * @property visitCount - 访问次数
 * @property lastVisitTime - 最后访问时间戳
 */
interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

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
 * @property children - 可选，子节点数组（这里是域名信息数组）
 */
interface HierarchyDatum {
  name: string;
  children?: DomainInfo[];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyData, onTooltipChange, onToggleFavorite]);

  /**
   * 截断文本以适应指定宽度的函数
   * @param text - 原始文本
   * @param boxWidth - 可用的最大宽度
   * @param textElement - D3文本元素，用于测量文本宽度
   * @returns 截断后的文本
   */
  const truncateText = (text: string, boxWidth: number, textElement: d3.Selection<SVGTextElement, unknown, null, undefined>) => {
    let truncated = text;
    while (truncated.length > 0) {
      textElement.text(truncated);
      const bbox = (textElement.node() as SVGTextElement).getBBox();
      if (bbox.width <= boxWidth) break;
      truncated = truncated.slice(0, -1);
    }
    return truncated;
  };

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
        // 从URL提取域名
        const domain = new URL(item.url).hostname;
        // 如果是新域名，创建新条目
        if (!domainData.has(domain)) {
          domainData.set(domain, {
            domain,
            visits: 0,
            items: []
          });
        }
        // 更新域名的访问统计
        const domainInfo = domainData.get(domain)!;
        domainInfo.visits += item.visitCount;
        domainInfo.items.push(item);
      } catch (e) {
        // 忽略无效URL，如chrome://开头的内部页面
      }
    });

    // 将Map转换为数组并按访问量降序排序
    const sortedDomains = Array.from(domainData.values())
      .sort((a, b) => b.visits - a.visits);

    // 计算所有域名的总访问量，用于计算百分比
    const totalVisits = sortedDomains.reduce((sum, d) => sum + d.visits, 0);

    // 创建D3树状图布局
    const treemapLayout = d3.treemap<HierarchyDatum>()
      .size([width, height])  // 设置树状图大小
      .paddingOuter(3)  // 外部填充
      .paddingInner(2)  // 内部填充（方块之间）
      .round(true);  // 对坐标进行四舍五入，确保像素对齐

    // 准备层次数据结构
    const hierarchyData = { name: 'root', children: sortedDomains };
    const root = d3.hierarchy(hierarchyData)
      .sum(d => (d as any).visits || 0)  // 使用访问量作为方块大小的依据
      .sort((a, b) => (b.value || 0) - (a.value || 0));  // 按值降序排序

    // 应用树状图布局算法，计算每个方块的位置和大小
    const rootWithLayout = treemapLayout(root) as TreemapNode;

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
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .append('rect')
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
      .on('click', function(this: SVGElement, event: MouseEvent, d: TreemapNode) {
        const data = d.data as unknown as DomainInfo;
        const url = data.items[0]?.url;
        if (url) {
          handleOpenUrl(url, data, event);
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

    /**
     * 处理域名，去除www和常见后缀，突出关键词
     * @param domain - 原始域名
     * @returns 格式化后的域名，更易于阅读
     */
    const formatDomain = (domain: string) => {
      // 移除www前缀
      let formattedDomain = domain.replace(/^www\./, '');
      // 移除常见顶级域名后缀
      formattedDomain = formattedDomain.replace(/\.(com|org|net|edu|gov|io|cn|co|me|app|site|xyz)$/, '');
      // 移除国家/地区代码后缀
      formattedDomain = formattedDomain.replace(/\.(uk|us|ca|jp|cn|ru|de|fr|au|br)$/, '');
      // 首字母大写
      formattedDomain = formattedDomain.charAt(0).toUpperCase() + formattedDomain.slice(1);
      return formattedDomain;
    };
    
    // 为较大的方块添加域名文本标签
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)  // 只为足够大的方块添加标签
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)  // 水平居中
      .attr('y', d => Math.min((d.y1 - d.y0) / 2, (d.y1 - d.y0) * 0.4))  // 垂直位置
      .attr('fill', 'white')  // 文本颜色
      .attr('font-size', d => {
        // 根据方块大小动态调整字体大小
        const width = d.x1 - d.x0;
        if (width > 150) return '24px';
        if (width > 100) return '20px';
        return '16px';
      })
      .attr('font-weight', '700')  // 粗体
      .attr('text-shadow', '2px 2px 4px rgba(0,0,0,0.9)')  // 增强文本阴影
      .style('text-anchor', 'middle')  // 文本水平居中对齐
      .style('dominant-baseline', 'central')  // 文本垂直居中对齐
      .each(function(d) {
        // 处理每个文本标签
        const data = d.data as unknown as DomainInfo;
        const text = formatDomain(data.domain);  // 格式化域名
        const boxWidth = d.x1 - d.x0 - 16;  // 可用宽度（减去边距）
        const textElement = d3.select(this);
        // 如果文本太长，进行截断
        const truncatedText = truncateText(text, boxWidth, textElement as d3.Selection<SVGTextElement, unknown, null, undefined>);
        textElement.text(truncatedText);
      });
      
    // 为较大的方块添加访问次数标签
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 50)  // 只为足够大的方块添加标签
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)  // 水平居中
      .attr('y', d => {
        // 计算垂直位置，位于域名标签下方
        const boxHeight = d.y1 - d.y0;
        const domainLabelPos = Math.min(boxHeight / 2, boxHeight * 0.4);
        const spacing = Math.min(boxHeight * 0.3, 30); 
        return domainLabelPos + spacing;
      })
      .attr('fill', 'rgba(255,255,255,0.95)')  // 文本颜色（增加不透明度）
      .attr('font-size', '12px')  // 字体大小
      .attr('text-shadow', '2px 2px 4px rgba(0,0,0,0.9)')  // 增强文本阴影
      .style('text-anchor', 'middle')  // 文本水平居中对齐
      .text(d => `${(d.data as unknown as DomainInfo).visits} visits`);  // 显示访问次数
      
    // 添加颜色图例，帮助理解颜色与访问量的对应关系
    const legendWidth = 200;
    const legendHeight = 20;
    
    // 创建图例的比例尺
    const legendScale = d3.scaleLinear()
      .domain([0, sortedDomains[0]?.visits || 1])  // 从0到最高访问量
      .range([0, legendWidth]);  // 映射到图例宽度
    
    // 创建图例的坐标轴
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)  // 显示5个刻度
      .tickFormat(d => `${d}`);  // 格式化刻度标签
    
    // 创建图例组
    const legend = svg.append('g')
      .attr('transform', `translate(${width - legendWidth - 10}, ${height + 25})`);  // 定位到底部
    
    // 创建渐变定义
    const defs = svg.append('defs');
    
    // 创建线性渐变
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    // 添加渐变色标
    gradient.selectAll('stop')
      .data([
        {offset: '0%', color: '#00ff00'},    // 绿色（低频率）
        {offset: '30%', color: '#adff2f'},   // 黄绿色
        {offset: '50%', color: '#ffff00'},   // 黄色（中频率）
        {offset: '70%', color: '#ffa500'},   // 橙色
        {offset: '100%', color: '#ff0000'}   // 红色（高频率）
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);
    
    // 添加图例矩形，使用渐变填充
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');
    
    // 添加图例坐标轴
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#ccc');  // 刻度标签颜色
    
    // 添加图例标题
    legend.append('text')
      .attr('x', -10)
      .attr('y', 10)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#ccc')
      .text('Visits:');
  };

  // 渲染组件
  return (
    <div ref={heatmapRef} style={{ width: '100%', height: '600px', minHeight: '600px' }} />
  );
};

export default Heatmap;

interface HierarchyDatum {
  name: string;
  children?: DomainInfo[];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyData, onTooltipChange, onToggleFavorite]);

  /**
   * 截断文本以适应指定宽度的函数
   * @param text - 原始文本
   * @param boxWidth - 可用的最大宽度
   * @param textElement - D3文本元素，用于测量文本宽度
   * @returns 截断后的文本
   */
  const truncateText = (text: string, boxWidth: number, textElement: d3.Selection<SVGTextElement, unknown, null, undefined>) => {
    let truncated = text;
    while (truncated.length > 0) {
      textElement.text(truncated);
      const bbox = (textElement.node() as SVGTextElement).getBBox();
      if (bbox.width <= boxWidth) break;
      truncated = truncated.slice(0, -1);
    }
    return truncated;
  };

  /**
   * 渲染热力图的主函数
   * 处理数据分组、创建D3树状图、添加交互和视觉效果
   */
  const renderHeatmap = () => {
    // 简化环境判断和URL打开逻辑
    const handleOpenUrl = (url: string, data: DomainInfo, event: MouseEvent) => {
      // 添加视觉反馈
      d3.select(event.currentTarget as Element)
        .transition()
        .duration(100)
        .attr('opacity', 0.7)
        .transition()
        .duration(100)
        .attr('opacity', 0.9);

      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (error: any) {
        onTooltipChange(
          `❌ 无法打开网站：${data.domain}\n${error.message}`,
          { x: event.pageX, y: event.pageY }
        );
      }
    };

    /**
     * 处理域名，去除www和常见后缀，突出关键词
     * @param domain - 原始域名
     * @returns 格式化后的域名，更易于阅读
     */
    const formatDomain = (domain: string) => {
      // 移除www前缀
      let formattedDomain = domain.replace(/^www\./, '');
      // 移除常见顶级域名后缀
      formattedDomain = formattedDomain.replace(/\.(com|org|net|edu|gov|io|cn|co|me|app|site|xyz)$/, '');
      // 移除国家/地区代码后缀
      formattedDomain = formattedDomain.replace(/\.(uk|us|ca|jp|cn|ru|de|fr|au|br)$/, '');
      // 首字母大写
      formattedDomain = formattedDomain.charAt(0).toUpperCase() + formattedDomain.slice(1);
      return formattedDomain;
    };
    
    // 为较大的方块添加域名文本标签
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)  // 只为足够大的方块添加标签
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)  // 水平居中
      .attr('y', d => Math.min((d.y1 - d.y0) / 2, (d.y1 - d.y0) * 0.4))  // 垂直位置
      .attr('fill', 'white')  // 文本颜色
      .attr('font-size', d => {
        // 根据方块大小动态调整字体大小
        const width = d.x1 - d.x0;
        if (width > 150) return '24px';
        if (width > 100) return '20px';
        return '16px';
      })
      .attr('font-weight', '700')  // 粗体
      .attr('text-shadow', '2px 2px 4px rgba(0,0,0,0.9)')  // 增强文本阴影
      .style('text-anchor', 'middle')  // 文本水平居中对齐
      .style('dominant-baseline', 'central')  // 文本垂直居中对齐
      .each(function(d) {
        // 处理每个文本标签
        const data = d.data as unknown as DomainInfo;
        const text = formatDomain(data.domain);  // 格式化域名
        const boxWidth = d.x1 - d.x0 - 16;  // 可用宽度（减去边距）
        const textElement = d3.select(this);
        // 如果文本太长，进行截断
        const truncatedText = truncateText(text, boxWidth, textElement as d3.Selection<SVGTextElement, unknown, null, undefined>);
        textElement.text(truncatedText);
      });
      
    // 为较大的方块添加访问次数标签
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 50)  // 只为足够大的方块添加标签
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)  // 水平居中
      .attr('y', d => {
        // 计算垂直位置，位于域名标签下方
        const boxHeight = d.y1 - d.y0;
        const domainLabelPos = Math.min(boxHeight / 2, boxHeight * 0.4);
        const spacing = Math.min(boxHeight * 0.3, 30); 
        return domainLabelPos + spacing;
      })
      .attr('fill', 'rgba(255,255,255,0.95)')  // 文本颜色（增加不透明度）
      .attr('font-size', '12px')  // 字体大小
      .attr('text-shadow', '2px 2px 4px rgba(0,0,0,0.9)')  // 增强文本阴影
      .style('text-anchor', 'middle')  // 文本水平居中对齐
      .text(d => `${(d.data as unknown as DomainInfo).visits} visits`);  // 显示访问次数
      
    // 添加颜色图例，帮助理解颜色与访问量的对应关系
    const legendWidth = 200;
    const legendHeight = 20;
    
    // 创建图例的比例尺
    const legendScale = d3.scaleLinear()
      .domain([0, sortedDomains[0]?.visits || 1])  // 从0到最高访问量
      .range([0, legendWidth]);  // 映射到图例宽度
    
    // 创建图例的坐标轴
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)  // 显示5个刻度
      .tickFormat(d => `${d}`);  // 格式化刻度标签
    
    // 创建图例组
    const legend = svg.append('g')
      .attr('transform', `translate(${width - legendWidth - 10}, ${height + 25})`);  // 定位到底部
    
    // 创建渐变定义
    const defs = svg.append('defs');
    
    // 创建线性渐变
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    // 添加渐变色标
    gradient.selectAll('stop')
      .data([
        {offset: '0%', color: '#00ff00'},    // 绿色（低频率）
        {offset: '30%', color: '#adff2f'},   // 黄绿色
        {offset: '50%', color: '#ffff00'},   // 黄色（中频率）
        {offset: '70%', color: '#ffa500'},   // 橙色
        {offset: '100%', color: '#ff0000'}   // 红色（高频率）
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);
    
    // 添加图例矩形，使用渐变填充
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');
    
    // 添加图例坐标轴
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#ccc');  // 刻度标签颜色
    
    // 添加图例标题
    legend.append('text')
      .attr('x', -10)
      .attr('y', 10)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#ccc')
      .text('Visits:');
  };

  // 渲染组件
  return (
    <div ref={heatmapRef} style={{ width: '100%', height: '600px', minHeight: '600px' }} />
  );
};

export default Heatmap;
