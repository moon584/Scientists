# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 启动开发环境

⚠️ **前后端必须同时启动。** 前端通过 Vite proxy 将 `/api` 转发到后端，后端不启动时聊天功能会报"网络请求失败，请检查后端服务是否启动。"

```bash
# 终端 1：启动后端 (Express, port 3001)
cd server && npm run dev

# 终端 2：启动前端 (Vite, port 3000)
pnpm dev
```

## 架构概览

```
src/                     # 前端 (React + Vite + TypeScript + Tailwind)
├── pages/               # 路由页面：Home, ScientistDetail, Statistics, AdminDashboard
├── components/          # 核心组件：ChatAssistant, ChatWidget, DraggableMascot, ScientistCard, LoginModal
├── contexts/            # authContext (用户认证, JWT token)
├── data/scientists.json # 50+ 位科学家静态数据
├── hooks/               # useTheme (暗色/亮色切换)
└── App.tsx              # 路由入口 + 全局导航

server/                  # 后端 (Express + SQL.js, port 3001)
├── server.js            # 所有 API 路由：认证、聊天、管理后台、语音识别
├── db.js                # SQL.js 数据库封装 (run/get/all/getValue)
├── auth.js              # JWT 生成与验证 + admin 中间件
├── initDb.js            # 建表 SQL
└── database.sqlite      # 自动生成的 SQLite 文件 (已 gitignore)
```

### API 路由

| 路径 | 功能 |
|------|------|
| POST `/api/chat` | 百度 AI 流式聊天 |
| POST `/api/speech-to-text` | 语音识别 (百度 ASR) |
| GET/POST `/api/chat/sessions` | 会话列表/新建 |
| GET `/api/chat/sessions/:id` | 会话消息 |
| DELETE `/api/chat/sessions/:id` | 删除会话 |
| POST `/api/auth/register` | 注册 |
| POST `/api/auth/login` | 登录 |
| GET `/api/auth/me` | 当前用户信息 |
| GET `/api/admin/*` | 管理后台 (需 admin 角色) |

## 关键约定

- **环境变量统一在根目录 `.env`**，后端在 `server.js:19` 通过 `dotenv` 从 `../.env` 读取
- **`VITE_API_URL` 留空**时前端通过 Vite proxy (port 3000 → 3001) 转发 API 请求；生产部署需修改为实际后端地址
- **数据库使用 SQL.js** (内存 SQLite + 文件持久化)，不是独立数据库服务
- **科学家数据**在 `src/data/scientists.json` 中维护，头像放在 `public/docs/头像/`
- **所有 API 需认证**的接口使用 JWT Bearer token (authContext 管理)
- **流式输出**：`/api/chat` 使用 SSE (Server-Sent Events)，事件类型: `meta` / `chunk` / `done` / `error`

## 已知常见问题

- 聊天报"网络请求失败" → 后端服务 (port 3001) 未启动，运行 `cd server && npm run dev`
- `database.sqlite` 是运行时自动生成的，初次启动后出现
- 百度 API 配置在 `.env` 的 `BAIDU_API_KEY` / `BAIDU_APP_ID` / `BAIDU_ASR_CLIENT_*`
