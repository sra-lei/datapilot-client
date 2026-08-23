# Services 模块

## 概述

Services 模块统一管理所有与后端服务器的通信，按业务系统分为 Core、Docs-Seeker、Doc-Kit 三个子模块（原 CharterMate 对接已迁移至 Docs-Seeker）。

## 目录结构

```
services/
├── index.ts              # 统一导出入口
├── types.ts              # 公共类型定义
├── core/                 # Core Service（Node.js Server）
│   ├── index.ts          # Core 模块导出
│   ├── constants.ts      # Core API 路径常量
│   ├── types.ts          # Core 类型定义
│   ├── user.ts           # 用户服务
│   ├── permission.ts     # 权限服务
│   ├── database.ts       # 数据库服务
│   ├── evalSet.ts        # 评估集服务
│   └── eval.ts           # 评估统计服务
└── docs-seeker/          # Docs-Seeker Service（Python FastAPI，RAG 检索问答）
    ├── index.ts          # Docs-Seeker 模块导出
    ├── constants.ts      # Docs-Seeker API 路径常量
    ├── types.ts          # Docs-Seeker 类型定义
    ├── request.ts        # 内部请求工具（裸 JSON，非 ApiResponse 包装）
    ├── system.ts         # 系统服务（健康检查）
    ├── stats.ts          # 运行指标（缓存 / 网关统计）
    └── chat.ts           # 对话服务（一次性返回，非流式）
```

## 使用示例

### 导入服务

```typescript
// Core Service
import { login, getAllRoles, getTables, getEvalStats } from './services/core';
import { CORE_API } from './services/core';

// Docs-Seeker Service
import { chatStream, checkDocsSeekerHealth, getCacheStats } from './services/docs-seeker';
import { DOCS_SEEKER_API } from './services/docs-seeker';

// 统一导入
import { chatStream, checkDocsSeekerHealth } from './services';
```

### 调用服务

```typescript
// Core Service - 用户登录
const result = await login({ username: 'admin', password: '123456' });

// Docs-Seeker Service - 问答（一次性返回完整回答）
await chatStream('什么是 xxx', (token) => console.log(token), () => {}, (e) => console.error(e));

// Docs-Seeker Service - 健康检查
const health = await checkDocsSeekerHealth(); // ApiResponse<DocsSeekerHealth>

// Docs-Seeker Service - 缓存统计
const cacheStats = await getCacheStats(); // ApiResponse<CacheStats>
```

## API 常量

```typescript
// Core Service API
CORE_API.USER.LOGIN           // /core/user/login
CORE_API.PERMISSION.LIST      // /core/permission/permissions
CORE_API.DATABASE.TABLES      // /core/database/tables
CORE_API.SYSTEM.HEALTH        // /core/health
CORE_API.EVAL.STATS           // /core/stats/eval

// Docs-Seeker Service API
DOCS_SEEKER_API.CHAT         // /v1/chat
DOCS_SEEKER_API.RETRIEVE     // /v1/retrieve
DOCS_SEEKER_API.HEALTH       // /v1/health
DOCS_SEEKER_API.STATS        // /v1/stats
```

## 类型定义

### 公共类型

| 类型 | 说明 |
|------|------|
| `ApiResponse<T>` | 统一响应格式 |

### Core Service 类型

| 类型 | 说明 |
|------|------|
| `UserInfo` | 用户信息 |
| `Permission` | 权限信息 |
| `Role` | 角色信息 |
| `TableInfo` | 表信息 |
| `DatabaseStats` | 数据库统计 |
| `EvalStatsData` | 评估统计（历史趋势 + 最新报告） |

### Docs-Seeker Service 类型

| 类型 | 说明 |
|------|------|
| `DocsSeekerHealth` | 服务健康状态（status / milvus_connected / redis_connected） |
| `ChatResponse` | 问答响应（answer / confidence / sources / cached） |
| `SourceDoc` | 引用来源文档 |
| `CacheStats` | 语义缓存统计 |
| `LLMStats` | LLM 网关统计（熔断 / 重试 / 降级） |

## 最佳实践

1. **按模块导入**：根据业务系统选择导入 `core` 或 `docs-seeker`
2. **使用常量**：所有 API 路径使用 `CORE_API` 或 `DOCS_SEEKER_API` 常量
3. **类型安全**：使用 TypeScript 类型定义，确保参数和返回值类型正确
4. **注意响应格式差异**：`core` 走 `ApiResponse` 包装；`docs-seeker` 为裸 JSON，service 层已做适配（`system.ts` / `stats.ts` 包装为 `ApiResponse`，`chat.ts` 直接使用）

## 添加新服务

1. 在对应模块的 `constants.ts` 中添加 API 路径
2. 在对应模块的 `types.ts` 中添加类型定义（如果需要）
3. 在对应模块中创建或更新服务文件
4. 在模块的 `index.ts` 中导出

## 服务器配置

服务的服务器地址由 `src/config/index.ts` 统一管理，支持环境变量配置（Docs-Seeker 默认 `http://localhost:8001`，开发/生产均通过 Vite 代理 / Nginx 反代以相对路径访问）。
