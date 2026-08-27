/**
 * Core Service API 路径常量
 */

export const CORE_API = {
  // 用户相关
  USER: {
    LOGIN: '/core/user/login',
    REGISTER: '/core/user/register',
    LIST: '/core/user/list',
    STATUS: '/core/user/status',
    CHANGE_PASSWORD: '/core/user/change-password',
    DELETE: (id: number) => `/core/user/${id}`,
  },

  // 权限相关
  PERMISSION: {
    LIST: '/core/permission/permissions',
    CREATE: '/core/permission/permissions',
    DELETE: (id: number) => `/core/permission/permissions/${id}`,
    GET: (id: number) => `/core/permission/permissions/${id}`,
    UPDATE: (id: number) => `/core/permission/permissions/${id}`,
  },

  // 角色相关
  ROLE: {
    LIST: '/core/permission/roles',
    CREATE: '/core/permission/roles',
    GET: (id: number) => `/core/permission/roles/${id}`,
    UPDATE: (id: number) => `/core/permission/roles/${id}`,
    DELETE: (id: number) => `/core/permission/roles/${id}`,
    GRANT_PERMISSION: (roleId: number) => `/core/permission/roles/${roleId}/permissions`,
    REVOKE_PERMISSION: (roleId: number, permissionId: number) =>
      `/core/permission/roles/${roleId}/permissions/${permissionId}`,
  },

  // 用户权限相关
  USER_PERMISSION: {
    ASSIGN_ROLE: (userId: number) => `/core/permission/users/${userId}/roles`,
    REVOKE_ROLE: (userId: number, roleId: number) =>
      `/core/permission/users/${userId}/roles/${roleId}`,
    GET_PERMISSIONS: (userId: number) => `/core/permission/users/${userId}/permissions`,
  },

  // 数据库相关
  DATABASE: {
    TABLES: '/core/database/tables',
    GET_TABLE_INFO: (tableName: string) =>
      `/core/database/tables/${encodeURIComponent(tableName)}/info`,
    GET_TABLE_DATA: (tableName: string) =>
      `/core/database/tables/${encodeURIComponent(tableName)}/data`,
    QUERY: '/core/database/query',
    STATS: '/core/database/stats',
  },

  // 评估集管理相关
  EVAL: {
    SETS: '/core/eval/sets',
    SET_DETAIL: (id: number) => `/core/eval/sets/${id}`,
    SET_IMPORT: '/core/eval/sets/import',
    SET_EXPORT: (id: number) => `/core/eval/sets/${id}/export`,
    CASES: (id: number) => `/core/eval/sets/${id}/cases`,
    CASE: (id: number) => `/core/eval/cases/${id}`,
    STATS: '/core/stats/eval',
    // 评估运行（结果入库）
    RUNS: '/core/eval/runs',
    RUNS_BATCH: '/core/eval/runs/batch',
    RUN_SET: (id: number) => `/core/eval/sets/${id}/runs`,
    RUN: (id: number) => `/core/eval/runs/${id}`,
    // 从已入库文档生成评估集（文档列表走 core 的 /doc-kit 代理，只读开放）
    DOCUMENTS: '/doc-kit/api/v1/documents',
    SETS_GENERATE: '/core/eval/sets/generate',
  },

  // 任务中心（长耗时操作异步化：提交 → 轮询 /core/tasks/:id）
  TASK: {
    SUBMIT_EVAL_SET_GENERATE: '/core/tasks/eval-set-generate',
    SUBMIT_EVAL_RUN: '/core/tasks/eval-run',
    LIST: '/core/tasks',
    DETAIL: (id: number) => `/core/tasks/${id}`,
    CANCEL: (id: number) => `/core/tasks/${id}/cancel`,
  },

  // 系统相关
  SYSTEM: {
    HEALTH: '/core/health',
  },
} as const;
