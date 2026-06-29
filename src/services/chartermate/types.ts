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

// 网关统计类型
export interface GatewayStats {
  total_calls: number;
  success_calls: number;
  fallback_calls: number;
  circuit_state: string;
  circuit_failures: number;
}
