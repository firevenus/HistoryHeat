import React, { useEffect, useRef, useState } from 'react';
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
 * 层次数据接口，用于D3树状图
 * @property children - 可选，子节点数组
 * @property name - 可选，节点名称
 */
interface HierarchyDatum {
  children?: DomainInfo[];
  name?: string;
}

/**
 * 树状图节点类型，D3的矩形层次节点，包含布局信息
 */
type TreemapNode = d3.HierarchyRectangularNode<HierarchyDatum>;

// 自定义右键菜单接口
interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  domain: string;
  onClose: () => void;
  onExcludeDomain: (domain: string) => void;
  onAddToFavorites: (domain: string) => void;
  onAddToBookmarks: (domain: string) => void;
  onVisitWebsite: (domain: string) => void;
}

/**
 * 自定义右键菜单组件
 */
const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  domain,
  onClose,
  onExcludeDomain,
  onAddToFavorites,
  onAddToBookmarks,
  onVisitWebsite
}) => {
  if (!visible) return null;

  // 菜单样式
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '4px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    padding: '4px 0',
    zIndex: 1000,
    minWidth: '180px'
  };

  // 菜单项样式
  const menuItemStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  // 处理点击外部关闭菜单
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div style={menuStyle} onClick={e => e.stopPropagation()}>
      <div 
        style={menuItemStyle} 
        className="menu-item"
        onClick={() => {
          onVisitWebsite(domain);
          onClose();
        }}
      >
        🌐 访问 {domain}
      </div>
      <div 
        style={menuItemStyle} 
        className="menu-item"
        onClick={() => {
          onExcludeDomain(domain);
          onClose();
        }}
      >
        🚫 取消统计 {domain}
      </div>
      <div 
        style={menuItemStyle} 
        className="menu-item"
        onClick={() => {
          onAddToFavorites(domain);
          onClose();
        }}
      >
        ⭐ 添加到收藏栏
      </div>
      <div 
        style={menuItemStyle} 
        className="menu-item"
        onClick={() => {
          onAddToBookmarks(domain);
          onClose();
        }}
      >
        📑 添加到浏览器收藏夹
      </div>
    </div>
  );
};

/**
 * 热力图组件
 * 将浏览历史数据可视化为热力图，按域名分组并根据访问频率着色
 */
const Heatmap: React.FC<HeatmapProps> = ({ historyData, onTooltipChange, onToggleFavorite }) => {
  // 引用DOM元素的容器
  const heatmapRef = useRef<HTMLDivElement>(null);
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    domain: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    domain: ''
  });

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu({...contextMenu, visible: false});
  };

  // 处理取消统计域名
  const handleExcludeDomain = (domain: string) => {
    // 发送消息到background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'EXCLUDE_DOMAIN',
        domain: domain
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error excluding domain:', chrome.runtime.lastError);
        } else {
          console.log('Domain excluded:', response);
          // 可以添加成功提示
          onTooltipChange(`✅ 已取消统计: ${domain}`, { x: contextMenu.x, y: contextMenu.y });
          setTimeout(() => onTooltipChange('', { x: 0, y: 0 }), 2000);
        }
      });
    }
  };

  // 处理添加到收藏栏
  const handleAddToFavorites = (domain: string) => {
    if (onToggleFavorite) {
      onToggleFavorite(domain);
      // 可以添加成功提示
      onTooltipChange(`⭐ 已添加到收藏栏: ${domain}`, { x: contextMenu.x, y: contextMenu.y });
      setTimeout(() => onTooltipChange('', { x: 0, y: 0 }), 2000);
    }
  };

  // 处理添加到浏览器收藏夹
  const handleAddToBookmarks = (domain: string) => {
    // 格式化URL
    let url = domain;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // 发送消息到background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'ADD_BOOKMARK',
        url: url,
        title: domain
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error adding bookmark:', chrome.runtime.lastError);
          onTooltipChange(`❌ 添加收藏夹失败: ${chrome.runtime.lastError.message || '未知错误'}`, 
            { x: contextMenu.x, y: contextMenu.y });
        } else {
          console.log('Bookmark added:', response);
          onTooltipChange(`📑 已添加到浏览器收藏夹: ${domain}`, { x: contextMenu.x, y: contextMenu.y });
        }
        setTimeout(() => onTooltipChange('', { x: 0, y: 0 }), 2000);
      });
    }
  };

  // 处理访问网站
  const handleVisitWebsite = (domain: string) => {
    openDomainUrl(domain, contextMenu.x, contextMenu.y);
  };

  // 通用的URL打开函数，统一处理不同上下文中的URL打开逻辑
  const openDomainUrl = (domain: string, x?: number, y?: number) => {
    // 构建URL，确保添加协议前缀
    let url = domain;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // 在Web环境和扩展环境都能工作的打开URL方法
    try {
      // 尝试使用扩展API打开URL
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: url });
      } else {
        // 回退到标准Web API
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      
      // 显示提示信息（如果有坐标）
      if (x !== undefined && y !== undefined) {
        onTooltipChange(`🌐 正在访问: ${domain}`, { x, y });
        setTimeout(() => onTooltipChange('', { x: 0, y: 0 }), 2000);
      }
    } catch (error) {
      console.error('打开URL时出错:', error);
      // 回退方案，确保能打开链接
      window.open(url, '_blank', 'noopener,noreferrer');
      
      // 显示提示信息（如果有坐标）
      if (x !== undefined && y !== undefined) {
        onTooltipChange(`⚠️ 打开方式已切换: ${domain}`, { x, y });
        setTimeout(() => onTooltipChange('', { x: 0, y: 0 }), 2000);
      }
    }
  };

  // 当历史数据或回调函数变化时重新渲染热力图
  useEffect(() => {
    console.log('Heatmap received data:', historyData.length, 'items');
    if (historyData.length > 0 && heatmapRef.current) {
      console.log('Rendering heatmap with data:', historyData.length, 'items');
      renderHeatmap();
    } else {
      console.log('Not rendering heatmap. Data length:', historyData.length, 'Container exists:', !!heatmapRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyData, onTooltipChange, onToggleFavorite]);

  /**
   * 渲染热力图的主函数
   * 处理数据分组、创建D3树状图、添加交互和视觉效果
   */
  const renderHeatmap = () => {
    console.log('Starting renderHeatmap with data:', historyData.length, 'items');
    
    // 清除现有内容，准备重新渲染
    d3.select(heatmapRef.current).selectAll('*').remove();

    // 设置图表尺寸和边距
    const margin = { top: 20, right: 40, bottom: 30, left: 40 };
    const containerWidth = heatmapRef.current?.clientWidth || 800;
    const containerHeight = heatmapRef.current?.clientHeight || 700;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    console.log('Container dimensions:', containerWidth, 'x', containerHeight);

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

    // 添加标题
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333');

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
        console.error('Error processing URL:', item.url, e);
        // 忽略无效URL，如chrome://开头的内部页面
      }
    });
    
    console.log('Grouped data by domain:', domainData.size, 'domains');

    // 将Map转换为数组并按访问量降序排序
    const sortedDomains = Array.from(domainData.values())
      .sort((a, b) => b.visits - a.visits);
    
    console.log('Sorted domains:', sortedDomains.length, 'items');
    
    if (sortedDomains.length === 0) {
      console.warn('No domain data to display in heatmap');
      return;
    }

    // 计算所有域名的总访问量，用于计算百分比
    const totalVisits = sortedDomains.reduce((sum, d) => sum + d.visits, 0);

    // 创建D3树状图布局
    const treemapLayout = d3.treemap<HierarchyDatum>()
      .size([width, height])  // 设置树状图大小
      .paddingOuter(3)  // 外部填充
      .paddingInner(2)  // 内部填充（方块之间）
      .round(true);  // 对坐标进行四舍五入，确保像素对齐

    // 准备层次数据结构
    const hierarchyData: HierarchyDatum = { name: 'root', children: sortedDomains };
    const root = d3.hierarchy<HierarchyDatum>(hierarchyData)
      .sum(d => (d as unknown as DomainInfo).visits || 0)  // 使用访问量作为方块大小的依据
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
    const nodes = svg.selectAll('.domain-node')
      .data(rootWithLayout.leaves())  // 使用叶子节点（每个域名一个）
      .enter()
      .append('g')  // 为每个域名创建一个组
      .attr('class', 'domain-node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // 为每个节点添加矩形，表示热力图的方块
    nodes.append('rect')
      .attr('id', i => `leaf-${i}`)
      .attr('width', d => Math.max(0, d.x1 - d.x0))  // 方块宽度
      .attr('height', d => Math.max(0, d.y1 - d.y0))  // 方块高度
      .attr('fill', d => {
        // 根据访问量设置填充颜色
        const data = d.data as unknown as DomainInfo;
        return colorScale(data.visits);
      })
      .attr('rx', 4)  // 水平圆角
      .attr('ry', 4)  // 垂直圆角
      .attr('stroke', d => {
        const data = d.data as unknown as DomainInfo;
        return d3.rgb(colorScale(data.visits)).darker(0.5).toString();
      })
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.8)
      .attr('fill-opacity', 0.9)  // 使用fill-opacity代替opacity
      .style('cursor', 'pointer')
      .on('click', function(event: MouseEvent, d: TreemapNode) {
        event.preventDefault();
        const data = d.data as unknown as DomainInfo;
        
        // 调用通用的URL打开函数
        openDomainUrl(data.domain);
      })
      .on('contextmenu', function(event: MouseEvent, d: TreemapNode) {
        event.preventDefault();  // 阻止默认的右键菜单
        event.stopPropagation();  // 阻止事件冒泡
        const data = d.data as unknown as DomainInfo;
        
        // 显示自定义右键菜单
        setContextMenu({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          domain: data.domain
        });
      })
      .on('mouseover', function(event: MouseEvent, d: TreemapNode) {
        // 高亮显示当前方块
        d3.select(this)
          .transition()  // 添加过渡动画
          .duration(150)  // 动画持续时间
          .attr('fill-opacity', 1)  // 增加不透明度
          .attr('stroke-width', 3)  // 加粗边框
          .attr('stroke-opacity', 1)  // 增加边框不透明度
          .attr('transform', 'scale(1.03)');  // 轻微放大

        // 更新提示框内容
        updateTooltip(event, d);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()  // 添加过渡动画
          .duration(150)  // 动画持续时间
          .attr('fill-opacity', 0.9)  // 恢复原始透明度
          .attr('stroke-width', 1)  // 恢复原始边框宽度
          .attr('stroke-opacity', 0.8)  // 恢复原始边框透明度
          .attr('transform', 'scale(1)');  // 恢复原始大小
          
        // 关闭提示框
        onTooltipChange('', { x: 0, y: 0 });
      })
      .on('mousemove', function(event: MouseEvent, d: TreemapNode) {
        // 更新提示框位置和内容
        updateTooltip(event, d);
      });

    /**
     * 更新提示框内容和位置
     * 抽取为函数以减少代码重复
     */
    const updateTooltip = (event: MouseEvent, d: TreemapNode) => {
      const data = d.data as unknown as DomainInfo;
      const percentage = ((data.visits / totalVisits) * 100).toFixed(1);
      
      // 获取完整的域名层次结构
      const domainParts = data.domain.split('.');
      const domainHierarchy = domainParts.reduce((result, part, i) => {
        if (i === 0) return part;
        return `${result}.${part}`;
      }, '');
      
      const lastVisit = new Date(Math.max(...data.items.map(item => item.lastVisitTime)));
      const topUrls = data.items
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, 5)
        .map(item => {
          const title = item.title || new URL(item.url).pathname;
          return `• ${title.length > 40 ? title.slice(0, 37) + '...' : title} (${item.visitCount}次)`;
        })
        .join('\n');

      // 更新提示框内容和位置
      onTooltipChange(
        `📊 ${data.domain}\n` +
        `域名层次: ${domainHierarchy}\n` +
        `访问量：${data.visits.toLocaleString()}次 (${percentage}%)\n` +
        `最近访问：${lastVisit.toLocaleString()}\n\n` +
        `热门页面：\n${topUrls}\n\n` +
        `🖱️ 点击访问网站 | 右键收藏`,
        { x: event.pageX, y: event.pageY }  // 提示框位置跟随鼠标
      );
    };

    /**
     * 处理域名，去除www和常见后缀，突出关键词
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
    
    // 添加clipPath，确保文本不溢出矩形边界
    nodes.append('clipPath')
      .attr('id', i => `clip-${i}`)
      .append('use')
      .attr('xlink:href', i => `#leaf-${i}`);
    
    // 为较大的方块添加域名文本标签
    nodes
      .filter(d => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 30)  // 只为足够大的方块添加标签
      .append('text')
      .attr('clip-path', i => `url(#clip-${i})`)  // 使用clipPath限制文本区域
      .attr('x', 5)  // 左侧留出少量空间
      .attr('y', 20)  // 顶部留出空间
      .attr('fill', 'white')  // 文本颜色
      .attr('font-size', d => {
        // 根据方块大小动态调整字体大小
        const width = d.x1 - d.x0;
        if (width > 150) return '18px';
        if (width > 100) return '14px';
        return '12px';
      })
      .attr('fill', 'rgba(255,255,255,0.9)')  // 文本颜色（半透明白色）
      .attr('text-shadow', '1px 1px 3px rgba(0,0,0,0.7)')  // 文本阴影
      .attr('font-weight', '700')  // 粗体
      .each(function(d) {
        // 处理每个文本标签
        const data = d.data as unknown as DomainInfo;
        const boxHeight = d.y1 - d.y0;
        const textElement = d3.select(this);
        
        // 将域名分割为多行显示
        const domain = formatDomain(data.domain);
        const words = domain.split(/(?=[A-Z][a-z])/g);  // 在驼峰命名的大写字母前分割
        
        words.forEach((word, i) => {
          textElement.append('tspan')
            .attr('x', 5)
            .attr('dy', i === 0 ? 0 : '1.2em')
            .text(word);
        });
        
        // 添加访问量信息
        if (boxHeight > 50) {
          textElement.append('tspan')
            .attr('x', 5)
            .attr('dy', '1.5em')
            .attr('fill-opacity', 0.8)
            .text(`${data.visits.toLocaleString()} 访问`);
        }
      });
      
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
      .attr('transform', `translate(${width - legendWidth - 20}, ${height + 10})`);  // 定位到底部
    
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
    <div>
      <div ref={heatmapRef} style={{ width: '100%', overflow: 'hidden' }} />
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        domain={contextMenu.domain}
        onClose={closeContextMenu}
        onExcludeDomain={handleExcludeDomain}
        onAddToFavorites={handleAddToFavorites}
        onAddToBookmarks={handleAddToBookmarks}
        onVisitWebsite={handleVisitWebsite}
      />
    </div>
  );
};

export default Heatmap;