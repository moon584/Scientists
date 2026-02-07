# 科学家精神传承网站

基于 React + Vite + Tailwind 的单页应用，收录 50+ 位中国杰出科学家，支持搜索、领域筛选、分页浏览，详情页可预览相关 PDF 资料。

## 快速开始

1) 安装依赖：`pnpm install`
2) 启动开发：`pnpm dev`（默认 http://localhost:3000）
3) 生产构建：`pnpm build`

## 资源放置说明

- **科学家数据**：`src/data/scientists.json`（头像与 PDF 路径使用绝对路径 `/docs/...`）。
- **资料 PDF**：放在 `public/docs/相关资料/`（命名示例：`张三.pdf`）。
- **头像图片**：放在 `public/docs/头像/`（命名示例：`张三.png`）。
- **默认头像**：`public/docs/头像/default.png`（当指定头像不存在时显示此图）。

## 技术栈与功能

- **核心栈**：React 18、Vite、TypeScript、Tailwind CSS、React Router 6。
- **动画与交互**：Framer Motion（页面过渡与卡片动画）、canvas-confetti（致敬特效）。
- **工具库**：pinyin-pro（支持姓名拼音/首字母搜索）。
- **主页**：
  - 智能搜索（支持中文、拼音、领域、标签检索）
  - 随机推荐科学家
  - 领域筛选、中文排序、分页、明暗主题切换
- **详情页**：
  - 头像加载容错处理
  - 献花致敬互动（带计数与动画）
  - 便捷的上一位/下一位导航
  - 美化的 PDF 资料预览入口