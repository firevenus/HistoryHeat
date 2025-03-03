import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HeatmapProps {
  historyData: HistoryItem[];
  onTooltipChange: (content: string, position: { x: number; y: number }) => void;
  onToggleFavorite?: (domain: string) => void;
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
}

interface DomainInfo {
  domain: string;
  visits: number;
  items: HistoryItem[];
}

interface HierarchyDatum {
  children?: DomainInfo[];
}

type TreemapNode = d3.HierarchyRectangularNode<HierarchyDatum>;

const Heatmap: React.FC<HeatmapProps> = ({ historyData, onTooltipChange, onToggleFavorite }) => {
  const heatmapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyData.length > 0 && heatmapRef.current) {
      renderHeatmap();
    }
  }, [historyData, onTooltipChange]);

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

  const renderHeatmap = () => {
    d3.select(heatmapRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 40, bottom: 30, left: 40 };
    const width = 960 - margin.left - margin.right;
    const height = 480 - margin.top - margin.bottom;

    const svg = d3.select(heatmapRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('display', 'block')
      .style('margin', '0 auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 添加背景
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#121212')
      .attr('rx', 8)
      .attr('ry', 8);

    // 按域名分组数据
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

    // 转换为数组并排序
    const sortedDomains = Array.from(domainData.values())
      .sort((a, b) => b.visits - a.visits);

    // 计算总访问量
    const totalVisits = sortedDomains.reduce((sum, d) => sum + d.visits, 0);

    // 创建treemap布局
    const treemapLayout = d3.treemap<HierarchyDatum>()
      .size([width, height])
      .paddingOuter(3)
      .paddingInner(2)
      .round(true);

    // 准备层次数据
    const root = d3.hierarchy<HierarchyDatum>({ children: sortedDomains })
      .sum(d => (d as unknown as DomainInfo).visits || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // 应用treemap布局
    const rootWithLayout = treemapLayout(root) as TreemapNode;

    // 颜色比例尺
    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateRgbBasis([
        '#00ff00',
        '#7cfc00',
        '#adff2f',
        '#ffff00',
        '#ffa500',
        '#ff4500',
        '#ff0000'
      ]))
      .domain([0, sortedDomains[0]?.visits || 1]);

    // 创建叶子节点
    const nodes = svg.selectAll('.domain-node')
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
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('stroke', d => {
        const data = d.data as unknown as DomainInfo;
        return d3.rgb(colorScale(data.visits)).darker(0.5).toString();
      })
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.8)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        const data = d.data as unknown as DomainInfo;
        if (data.items.length > 0) {
          window.open(`https://${data.domain}`, '_blank');
        }
      })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        const data = d.data as unknown as DomainInfo;
        if (onToggleFavorite) {
          onToggleFavorite(data.domain);
        }
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke-width', 3)
          .attr('stroke-opacity', 1)
          .attr('transform', 'scale(1.03)');

        const data = d.data as unknown as DomainInfo;
        const percentage = ((data.visits / totalVisits) * 100).toFixed(1);
        const topUrls = data.items
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5)
          .map(item => `${item.title || item.url} (${item.visitCount}次)`)
          .join('\n');

        onTooltipChange(
          `${data.domain}\nVisits: ${data.visits} (${percentage}%)\n\nPopular Pages:\n${topUrls}`,
          { x: event.pageX, y: event.pageY }
        );
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.9)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.8)
          .attr('transform', 'scale(1)');
      })
      .on('mousemove', (event, d) => {
        const data = d.data as unknown as DomainInfo;
        const percentage = ((data.visits / totalVisits) * 100).toFixed(1);
        const topUrls = data.items
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5)
          .map(item => `${item.title || item.url} (${item.visitCount}次)`)
          .join('\n');

        onTooltipChange(
          `${data.domain}\nVisits: ${data.visits} (${percentage}%)\n\nPopular Pages:\n${topUrls}`,
          { x: event.pageX, y: event.pageY }
        );
      });

    // 处理域名，去除www和常见后缀，突出关键词
    const formatDomain = (domain: string) => {
      let formattedDomain = domain.replace(/^www\./, '');
      formattedDomain = formattedDomain.replace(/\.(com|org|net|edu|gov|io|cn|co|me|app|site|xyz)$/, '');
      formattedDomain = formattedDomain.replace(/\.(uk|us|ca|jp|cn|ru|de|fr|au|br)$/, '');
      formattedDomain = formattedDomain.charAt(0).toUpperCase() + formattedDomain.slice(1);
      return formattedDomain;
    };
    
    // 添加文本标签（仅对较大的块）
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)
      .attr('y', d => Math.min((d.y1 - d.y0) / 2, (d.y1 - d.y0) * 0.4))
      .attr('fill', 'white')
      .attr('font-size', d => {
        const width = d.x1 - d.x0;
        if (width > 150) return '24px';
        if (width > 100) return '20px';
        return '16px';
      })
      .attr('font-weight', '700')
      .attr('text-shadow', '1px 1px 3px rgba(0,0,0,0.7)')
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'central')
      .each(function(d) {
        const data = d.data as unknown as DomainInfo;
        const text = formatDomain(data.domain);
        const boxWidth = d.x1 - d.x0 - 16;
        const textElement = d3.select(this);
        const truncatedText = truncateText(text, boxWidth, textElement as d3.Selection<SVGTextElement, unknown, null, undefined>);
        textElement.text(truncatedText);
      });
      
    // 为较大的块添加访问次数标签
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 50)
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)
      .attr('y', d => {
        const boxHeight = d.y1 - d.y0;
        const domainLabelPos = Math.min(boxHeight / 2, boxHeight * 0.4);
        const spacing = Math.min(boxHeight * 0.3, 30); 
        return domainLabelPos + spacing;
      })
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '12px')
      .attr('text-shadow', '1px 1px 3px rgba(0,0,0,0.7)')
      .style('text-anchor', 'middle')
      .text(d => `${(d.data as unknown as DomainInfo).visits} visits`);
      
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
  };

  return (
    <div ref={heatmapRef} style={{ width: '100%', height: '100%' }} />
  );
};

export default Heatmap;