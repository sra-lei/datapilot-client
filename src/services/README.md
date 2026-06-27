# Services 模块

## 概述

Services 模块统一管理所有与后端服务器的通信，按业务系统分为 Core 和 CharterMate 两个子模块。

## 目录结构

```
services/
├── index.ts              # 统一导出入口
├── core/                 # Core Service（Node.js Server）
│   ├── index.ts          # Core 模块导出
│   ├── constants.ts      # Core API 路径常量
│   ├── types.ts          # Core 类型定义
│   ├── user.ts           # 用户服务
│   ├── permission.ts     # 权限服务
│   └── database.ts       # 数据库服务
└── chartermate/          # CharterMate Service（Python Server）
    ├── index.ts          # CharterMate 模块导出
    ├── constants.ts      # CharterMate API 路径常量
    ├── types.ts          # CharterMate 类型定义
    ├── system.ts         # 系统服务（健康检查等）
    ├── database.ts       # 数据库服务
    └── cache.ts          # 缓存服务
```

## 使用示例

### 导入服务

```typescript
// Core Service
import { login, getAllRoles, getTables, checkHealth } from './services/core';
import { CORE_API } from './services/core';

// CharterMate Service
import { checkHealth, getCacheStats, getTables } from './services/chartermate';
import { CHARTERMATE_API } from './services/chartermate';

// 统一导入（同时导出两个模块）
import { login, checkHealth } from './services';
```

### 调用服务

```typescript
// Core Service - 用户登录
const result = await login({ username: 'admin', password: '123456' });

// Core Service - 获取角色列表
const roles = await getAllRoles();

// CharterMate Service - 检查健康状态
const health = await checkHealth();

// CharterMate Service - 获取缓存统计
const cacheStats = await getCacheStats();
```

## API 常量

```typescript
// Core Service API
CORE_API.USER.LOGIN           // /core/user/login
CORE_API.PERMISSION.LIST      // /core/permission/permissions
CORE_API.DATABASE.TABLES      // /core/database/tables
CORE_API.SYSTEM.HEALTH        // /core/health

// CharterMate Service API
CHARTERMATE_API.SYSTEM.HEALTH // /api/v1/health
CHARTERMATE_API.CACHE.STATS   // /api/v1/cache/stats
CHARTERMATE_API.DATABASE.TABLES // /core/database/tables
```

## 类型定义

### Core Service 类型

| 类型 | 说明 |
|------|------|
| `ApiResponse<T>` | 统一响应格式 |
| `UserInfo` | 用户信息 |
| `Permission` | 权限信息 |
| `Role` | 角色信息 |
| `TableInfo` | 表信息 |
| `DatabaseStats` | 数据库统计 |

### CharterMate Service 类型

| 类型 | 说明 |
|------|------|
| `ApiResponse<T>` | 统一响应格式 |
| `ServiceHealth` | 服务健康状态 |
| `CacheStats` | 缓存统计信息 |
| `BusinessUser` | 业务用户信息 |

## 最佳实践

1. **按模块导入**：根据业务系统选择导入 `core` 或 `chartermate`
2. **使用常量**：所有 API 路径使用 `CORE_API` 或 `CHARTERMATE_API` 常量
3. **类型安全**：使用 TypeScript 类型定义，确保参数和返回值类型正确
4. **统一错误处理**：所有服务返回统一的 `ApiResponse` 格式

## 添加新服务

1. 在对应模块的 `constants.ts` 中添加 API 路径
2. 在对应模块的 `types.ts` 中添加类型定义（如果需要）
3. 在对应模块中创建或更新服务文件
4. 在模块的 `index.ts` 中导出

## 服务器配置

服务的服务器地址由 `src/config/index.ts` 统一管理，支持环境变量配置。