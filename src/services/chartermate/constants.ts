/**
 * CharterMate Service API 路径常量
 */

export const CHARTERMATE_API = {
  // 用户相关
  USER: {
    LIST: '/core/user/list',
    REGISTER: '/core/user/register',
    LOGIN: '/core/user/login',
    STATUS: '/core/user/status',
    CHANGE_PASSWORD: '/core/user/password',
  },

  // 权限相关
  PERMISSION: {
    INITIALIZE: '/core/permission/initialize',
    ROLE_LIST: '/core/permission/role/list',
    CREATE_ROLE: '/core/permission/role',
    PERMISSION_LIST: '/core/permission/permission/list',
    CREATE_PERMISSION: '/core/permission/permission',
    ASSIGN_ROLE: '/core/permission/assign-role',
    ASSIGN_PERMISSION: '/core/permission/assign-permission',
    GET_USER_PERMISSIONS: (userId: number) => `/core/permission/user/${userId}`,
  },

  // 数据库相关
  DATABASE: {
    TABLES: '/core/database/tables',
    GET_TABLE_STRUCTURE: (tableName: string) =>
      `/core/database/table/${tableName}/structure`,
    GET_TABLE_DATA: (tableName: string) =>
      `/core/database/table/${tableName}/data`,
    QUERY: '/core/database/query',
    STATS: '/core/database/stats',
  },

  // 系统相关
  SYSTEM: {
    HEALTH: '/api/v1/health',
  },

  // 缓存相关
  CACHE: {
    STATS: '/api/v1/cache/stats',
  },
} as const;