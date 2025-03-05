# Contributing to HistoryHeat

## 项目概述
HistoryHeat是一个浏览器历史记录热图可视化工具，使用React + TypeScript + Vite构建。

## 开发环境配置
### 系统要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 开发服务器
```bash
npm run dev
```

## 代码规范
### TypeScript规范
- 使用严格模式（strict mode）
- 所有变量和函数必须有类型声明
- 避免使用any类型

### React规范
- 使用函数组件和Hooks
- 组件文件使用.tsx扩展名
- 遵循React Hooks的使用规则

### 样式规范
- 使用Tailwind CSS进行样式开发
- 遵循项目现有的主题设计

## 提交规范
### 分支管理
- main: 主分支，用于发布
- develop: 开发分支
- feature/*: 功能分支
- bugfix/*: 修复分支

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型（type）：
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

### Pull Request流程
1. Fork项目
2. 创建功能分支
3. 提交代码
4. 确保测试通过
5. 提交Pull Request

## 测试规范
- 新功能必须包含单元测试
- 测试覆盖率要求达到80%以上
- 使用Jest进行测试

## 文档规范
- 代码必须包含适当的注释
- 更新README.md相关内容
- 更新CHANGELOG.md
- 多语言文档同步更新

## 本地化
- 所有用户界面文本必须支持国际化
- 在src/locales下添加对应的语言文件
- 使用i18n工具进行翻译管理

## 发布流程
1. 更新版本号
2. 更新CHANGELOG.md
3. 构建生产版本
4. 提交发布请求

## 帮助和支持
如有任何问题，请：
1. 查看项目文档
2. 搜索已有的Issues
3. 创建新的Issue

感谢您为HistoryHeat项目做出的贡献！