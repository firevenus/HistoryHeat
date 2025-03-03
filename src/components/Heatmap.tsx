import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface HeatmapProps {
  historyData: HistoryItem[];
  onTooltipChange: (content: string, position: { x: number; y: number }) => void;
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

const Heatmap: React.FC<HeatmapProps> = ({ historyData, onTooltipChange }) => {
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    if (historyData.length > 0 && heatmapRef.current) {
      renderHeatmap();
    }
  }, [historyData, onTooltipChange, zoomLevel]);

  const renderHeatmap = () => {
    d3.select(heatmapRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(heatmapRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 添加背景
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#121212') // 深色背景，类似coin360
      .attr('rx', 8)
      .attr('ry', 8);

    // 按域名分组数据
    const domainData = new Map();
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
        const domainInfo = domainData.get(domain);
        domainInfo.visits += item.visitCount;
        domainInfo.items.push(item);
      } catch (e) {
        // 忽略无效URL
      }
    });

    // 转换为数组并排序
    const sortedDomains = Array.from(domainData.values())
      .sort((a, b) => b.visits - a.visits);

    // 计算总访问量
    const totalVisits = sortedDomains.reduce((sum, d) => sum + d.visits, 0);

    // 创建treemap布局
    const treemapLayout = d3.treemap()
      .size([width, height])
      .paddingOuter(3)
      .paddingInner(2)
      .round(true);

    // 准备层次数据
    const root = d3.hierarchy({ children: sortedDomains })
      .sum(d => d.visits)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // 应用treemap布局
    treemapLayout(root);

    // 颜色比例尺 - 使用更丰富的颜色渐变，类似coin360
    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateRgbBasis([
        '#00ff00', // 绿色（上涨）
        '#7cfc00',
        '#adff2f',
        '#ffff00', // 黄色（中性）
        '#ffa500',
        '#ff4500',
        '#ff0000'  // 红色（下跌）
      ]))
      .domain([0, sortedDomains[0]?.visits || 1]);

    // 创建叶子节点
    const nodes = svg.selectAll('.domain-node')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'domain-node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // 添加矩形
    nodes.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        // 根据访问量计算颜色
        const normalizedValue = (d.data.visits / totalVisits) * sortedDomains.length;
        return colorScale(d.data.visits);
      })
      .attr('rx', 4) // 圆角
      .attr('ry', 4)
      .attr('stroke', d => d3.rgb(colorScale(d.data.visits)).darker(0.5).toString())
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.8)
      .attr('opacity', 0.9)
      .on('mouseover', function(event, d) {
        // 鼠标悬停效果
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke-width', 3)
          .attr('stroke-opacity', 1)
          .attr('transform', 'scale(1.03)');

        // 显示详细信息
        const percentage = ((d.data.visits / totalVisits) * 100).toFixed(1);
        const topUrls = d.data.items
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5)
          .map(item => `${item.title || item.url} (${item.visitCount}次)`)
          .join('\n');

        onTooltipChange(
          `${d.data.domain}\nVisits: ${d.data.visits} (${percentage}%)\n\nPopular Pages:\n${topUrls}`,
          { x: event.pageX, y: event.pageY }
        );
      })
      .on('mouseout', function() {
        // 鼠标移出效果
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.9)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.8)
          .attr('transform', 'scale(1)');
      })
      .on('mousemove', (event, d) => {
        // 更新tooltip位置
        const percentage = ((d.data.visits / totalVisits) * 100).toFixed(1);
        const topUrls = d.data.items
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5)
          .map(item => `${item.title || item.url} (${item.visitCount}次)`)
          .join('\n');

        onTooltipChange(
          `${d.data.domain}\nVisits: ${d.data.visits} (${percentage}%)\n\nPopular Pages:\n${topUrls}`,
          { x: event.pageX, y: event.pageY }
        );
      });

    // 处理域名，去除www和常见后缀，突出关键词
    const formatDomain = (domain: string) => {
      // 去除www前缀
      let formattedDomain = domain.replace(/^www\./, '');
      
      // 去除常见顶级域名后缀
      formattedDomain = formattedDomain.replace(/\.(com|org|net|edu|gov|io|cn|co|me|app|site|xyz)$/, '');
      
      // 去除国家代码后缀
      formattedDomain = formattedDomain.replace(/\.(uk|us|ca|jp|cn|ru|de|fr|au|br)$/, '');
      
      // 首字母大写
      formattedDomain = formattedDomain.charAt(0).toUpperCase() + formattedDomain.slice(1);
      
      return formattedDomain;
    };
    
    // 添加文本标签（仅对较大的块）
    if (showLabels) {
      nodes
        .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30) // 只为足够大的块添加标签
        .append('text')
        .attr('x', d => (d.x1 - d.x0) / 2) // 水平居中
        .attr('y', d => Math.min((d.y1 - d.y0) / 2, (d.y1 - d.y0) * 0.4)) // 改进的垂直居中，根据方块高度动态调整
        .attr('fill', 'white')
        .attr('font-size', d => {
          // 根据方框宽度动态调整字体大小
          const width = d.x1 - d.x0;
          if (width > 150) return '24px';
          if (width > 100) return '20px';
          return '16px';
        })
        .attr('font-weight', '700')
        .attr('text-shadow', '1px 1px 3px rgba(0,0,0,0.7)') // 添加文本阴影增强可见度
        .style('text-anchor', 'middle') // 文本水平居中
        .style('dominant-baseline', 'central') // 使用central而非middle以获得更好的垂直居中效果
        .each(function(d) {
          // 获取文本内容和方框宽度
          const text = formatDomain(d.data.domain);
          const boxWidth = d.x1 - d.x0 - 16; // 减去左右边距
          
          // 如果文本过长，进行截断
          const textElement = d3.select(this);
          const truncatedText = truncateText(text, boxWidth, textElement);
          textElement.text(truncatedText);
        });
        
      // 为较大的块添加访问次数标签
      nodes
        .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 50) // 只为足够大的块添加标签
        .append('text')
        .attr('x', d => (d.x1 - d.x0) / 2) // 水平居中
        .attr('y', d => {
          // 动态计算访问次数标签的位置，确保与域名标签有适当间距
          const boxHeight = d.y1 - d.y0;
          const domainLabelPos = Math.min(boxHeight / 2, boxHeight * 0.4);
          // 增加间距，从0.25倍高度增加到0.3倍，最小间距从25px增加到30px
          const spacing = Math.min(boxHeight * 0.3, 30); 
          return domainLabelPos + spacing;
        }) // 在域名下方居中
        .attr('fill', 'rgba(255,255,255,0.8)') // 增加不透明度提高可见度
        .attr('font-size', '12px') // 稍微增大字体
        .attr('text-shadow', '1px 1px 3px rgba(0,0,0,0.7)') // 增强文本阴影以提高可读性
        .style('text-anchor', 'middle') // 文本水平居中
        .text(d => `${d.data.visits} visits`);
    }
      
    // 文本截断辅助函数
    function truncateText(text, maxWidth, textElement) {
      // 如果文本很短，直接返回
      if (text.length <= 5) return text;
      
      // 尝试计算文本宽度（近似值）
      const approxCharWidth = 10; // 假设每个字符平均宽度
      const approxTextWidth = text.length * approxCharWidth;
      
      // 如果预估宽度小于最大宽度，直接返回
      if (approxTextWidth <= maxWidth) return text;
      
      // 否则截断文本并添加省略号
      const charsFit = Math.floor(maxWidth / approxCharWidth) - 1;
      return text.substring(0, Math.max(charsFit, 3)) + '...';
    }
      
    // 为较大的块添加访问次数标签
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 50) // 只为足够大的块添加标签
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2) // 水平居中
      .attr('y', d => {
        // 动态计算访问次数标签的位置，确保与域名标签有适当间距
        const boxHeight = d.y1 - d.y0;
        const domainLabelPos = Math.min(boxHeight / 2, boxHeight * 0.4);
        // 增加间距，从0.25倍高度增加到0.3倍，最小间距从25px增加到30px
        const spacing = Math.min(boxHeight * 0.3, 30); 
        return domainLabelPos + spacing;
      }) // 在域名下方居中
      .attr('fill', 'rgba(255,255,255,0.8)') // 增加不透明度提高可见度
      .attr('font-size', '12px') // 稍微增大字体
      .attr('text-shadow', '1px 1px 3px rgba(0,0,0,0.7)') // 增强文本阴影以提高可读性
      .style('text-anchor', 'middle') // 文本水平居中
      .text(d => `${d.data.visits} visits`);
      
    // 添加图例
    const legendWidth = 200;
    const legendHeight = 20;
    
    const legendScale = d3.scaleLinear()
      .domain([0, sortedDomains[0]?.visits || 1])
      .range([0, legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => `${d}`);
    
    const legend = svg.append('g')
      .attr('transform', `translate(${width - legendWidth - 10}, ${height + 25})`);
    
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');
    
    gradient.selectAll('stop')
      .data([
        {offset: '0%', color: '#00ff00'},
        {offset: '30%', color: '#adff2f'},
        {offset: '50%', color: '#ffff00'},
        {offset: '70%', color: '#ffa500'},
        {offset: '100%', color: '#ff0000'}
      ])
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');
    
    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#ccc');
    
    legend.append('text')
      .attr('x', -10)
      .attr('y', 10)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#ccc')
      .text('Visits:');

    // 不需要坐标轴，因为我们使用的是treemap布局
  };

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-controls">
        <button 
          onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
          className="zoom-button"
        >
          -
        </button>
        <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
        <button 
          onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
          className="zoom-button"
        >
          +
        </button>
      </div>
      <div 
        ref={heatmapRef} 
        className="heatmap-container" 
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
        onMouseLeave={() => {
          // 清空tooltip内容并将其位置重置到不可见区域
          onTooltipChange('', { x: -1000, y: -1000 });
        }}
      />
    </div>
  );
};

export default Heatmap;