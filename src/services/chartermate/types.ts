/**
 * CharterMate Service 类型定义
 */

// 服务健康状态
export interface ServiceHealth {
  status: string;
  service: string;
}

// 缓存统计类型
export interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: string;
  size: number;
}
