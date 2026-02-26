# 科学家精神传承网站

基于 React + Vite + Tailwind 的单页应用，收录 50+ 位中国杰出科学家，支持搜索、领域筛选、分页浏览，以及基于百度 AppBuilder 的 AI 智能问答助手。

## 🌟 主要功能

- **👥 科学家人物库**：收录详细生平与贡献，支持智能搜索（中文、拼音、首字母）。
- **� 数据图谱**：多维度可视化分析，包含领域分布、籍贯热点及年代跨度统计。
- **🔍 智能检索**：按领域筛选、拼音/汉字排序、分页展示。
- **📚 资料预览**：集成 PDF 资料预览与下载功能。
- **🤖 AI 问答助手**：集成百度 AppBuilder 智能体，提供实时的科学家精神相关问答服务。
- **🌓 沉浸体验**：支持明暗主题切换、献花致敬特效（Canvas Confetti）、Framer Motion 平滑动画。

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制示例文件创建 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的百度 AppBuilder 应用配置（用于聊天助手）：

```env
# 百度 AppBuilder 聊天助手配置
VITE_APPBUILDER_URL=https://appbuilder.baidu.com/s/9LXqQPf6
```

### 3. 启动开发服务

```bash
pnpm dev
# 访问 http://localhost:3000
```

### 4. 生产环境构建

```bash
pnpm build
```

## 📂 目录结构说明

```text
├── public/                 # 静态资源
│   └── docs/
│       ├── 头像/          # 科学家头像 (命名: 姓名.png)
│       └── 相关资料/      # PDF资料 (命名: 姓名.pdf)
├── src/
│   ├── components/         # 核心组件 (ScientistCard, BackToTop等)
│   ├── contexts/           # 全局状态 (Auth等)
│   ├── data/               # 静态数据 (scientists.json)
│   ├── hooks/              # 自定义钩子 (useTheme等)
│   ├── pages/              # 页面视图 (Home, Detail, Statistics)
│   └── App.tsx             # 应用入口与路由配置
├── .env.example            # 环境变量模版
├── index.html              # 入口 HTML
└── package.json            # 依赖配置
```

## 🛠 技术栈

- **前端框架**：React 18, TypeScript, Vite
- **UI 样式**：Tailwind CSS, Framer Motion
- **数据可视化**：Recharts
- **路由管理**：React Router v6
- **AI 集成**：Baidu AppBuilder (Iframe)
- **工具库**：pinyin-pro, canvas-confetti, react-pdf

## 📝 维护指南

- **添加科学家**：在 `src/data/scientists.json` 中添加条目（注意 `field` 字段现已升级为数组格式），并将对应资源放入 `public/docs/`。
- **更新 AI**：在百度 AppBuilder 平台调整提示词或知识库，前端无需修改代码（仅需确保 `.env` 配置正确）。
