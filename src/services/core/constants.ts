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
  },

  // 系统相关
  SYSTEM: {
    HEALTH: '/core/health',
  },
} as const;
