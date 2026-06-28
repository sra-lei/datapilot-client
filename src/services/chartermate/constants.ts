/**
 * CharterMate Service API 路径常量
 */

export const CHARTERMATE_API = {
  // 系统相关
  SYSTEM: {
    HEALTH: "/api/v1/health",
  },

  // 缓存相关
  CACHE: {
    STATS: "/api/v1/cache/stats",
  },
} as const;
