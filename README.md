# Trae Management Client

基于 React 18 + TypeScript + Vite 构建的企业级管理后台前端应用。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + React Router 7 |
| UI 组件库 | Ant Design 5 + Ant Design Pro Components |
| 权限控制 | @casl/ability（基于能力的访问控制） |
| 图表 | ECharts 6 + echarts-for-react |
| 构建工具 | Vite 5 |
| 开发语言 | TypeScript 6 |
| 代码规范 | ESLint 9 + TypeScript ESLint |
| 部署 | Docker 多阶段构建 + Nginx |

## 项目结构

```
client/
├── public/                  # 静态资源
├── src/
│   ├── components/          # 公共组件
│   │   ├── Can.tsx          # 权限控制组件
│   │   └── ChatWidget.tsx   # 对话组件
│   ├── config/              # 配置管理
│   │   ├── index.ts         # 应用配置
│   │   └── theme.ts         # 主题配置
│   ├── contexts/            # React Context
│   │   └── PermissionContext.tsx  # 权限上下文
│   ├── layouts/             # 布局组件
│   │   └── MainLayout.tsx   # 主布局
│   ├── pages/               # 页面
│   │   ├── Dashboard.tsx        # 仪表盘
│   │   ├── RagDashboard.tsx     # RAG 仪表盘
│   │   ├── DatabaseViewer.tsx   # 数据库查看器
│   │   ├── Users.tsx            # 用户管理
│   │   ├── Permissions.tsx      # 权限管理
│   │   ├── Settings.tsx         # 系统设置
│   │   ├── Profile.tsx          # 个人中心
│   │   ├── About.tsx            # 关于页面
│   │   ├── Login.tsx            # 登录
│   │   ├── Register.tsx         # 注册
│   │   └── NotFound.tsx         # 404 页面
│   ├── routes/              # 路由配置
│   │   ├── index.tsx        # 路由定义
│   │   └── ProtectedRoute.tsx    # 受保护路由
│   ├── services/            # API 服务层
│   │   ├── core/            # Core Service（Node.js 后端）
│   │   │   ├── user.ts      # 用户服务
│   │   │   ├── permission.ts # 权限服务
│   │   │   └── database.ts  # 数据库服务
│   │   └── docs-seeker/     # Docs-Seeker Service（Python FastAPI，RAG 检索问答）
│   │       ├── chat.ts      # 对话服务（一次性返回）
│   │       ├── stats.ts     # 运行指标（缓存/网关统计）
│   │       └── system.ts    # 系统服务（健康检查）
│   ├── types/               # 全局类型定义
│   ├── utils/               # 工具函数
│   │   └── request.ts       # HTTP 请求封装
│   ├── App.tsx              # 应用入口
│   ├── main.tsx             # 渲染入口
│   └── index.css            # 全局样式
├── .env                     # 环境变量（通用）
├── .env.development         # 环境变量（开发）
├── Dockerfile               # Docker 构建文件
├── nginx.conf               # Nginx 配置
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
└── package.json             # 项目配置
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器运行在 `http://localhost:3001`。

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist` 目录。

### 预览构建结果

```bash
npm run preview
```

### 代码检查

```bash
# 检查代码规范
npm run lint

# 自动修复
npm run lint:fix
```

## 代理配置

开发环境通过 Vite 代理转发 API 请求到后端服务：

| 路径前缀 | 目标服务 | 说明 |
|----------|---------|------|
| `/core` | Node.js Core Service | 用户、权限、数据库等核心服务 |
| `/v1` | Python Docs-Seeker Service | RAG 检索问答（chat / retrieve / health / stats） |

代理配置位于 `vite.config.ts`，服务器地址通过 `.env.development` 中的环境变量管理。

## 服务架构

Services 层按业务系统分为三个子模块：

- **Core Service**（`src/services/core/`）：对接 Node.js 后端，负责用户认证、权限管理、数据库操作、评估统计等核心功能
- **Docs-Seeker Service**（`src/services/docs-seeker/`）：对接 Python FastAPI 后端，负责 RAG 检索问答、健康检查、缓存/网关运行指标
- **Doc-Kit Service**（`src/services/doc-kit/`）：对接文档解析 / 向量入库服务

详细使用说明参见 `src/services/README.md`。

## Docker 部署

项目使用多阶段 Docker 构建：

1. **Builder 阶段**：使用 Node.js 20 安装依赖并构建静态资源
2. **运行阶段**：使用 Nginx 托管静态资源，时区设置为 `Asia/Shanghai`

```bash
# 构建 Docker 镜像
docker build -t trae-client .

# 运行容器
docker run -d -p 80:80 trae-client
```

## 路径别名

项目配置了路径别名 `@` 指向 `src` 目录，方便模块导入：

```ts
// 示例：导入页面组件
import Dashboard from './pages/Dashboard';
// 示例：导入服务
import { login } from './services/core';
```

## 功能模块

- **仪表盘**：数据概览与统计展示
- **RAG 仪表盘**：RAG 系统状态监控
- **数据库查看器**：数据库表结构浏览
- **用户管理**：用户增删改查
- **权限管理**：基于角色的访问控制（RBAC）
- **系统设置**：系统参数配置
- **个人中心**：用户个人信息管理
- **智能对话**：基于 RAG 的对话助手
