/**
 * CharterMate Service 缓存服务
 */

import { chartermateRequest } from '../../utils/request';
import { CHARTERMATE_API } from './constants';
import type { ApiResponse, CacheStats } from './types';

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<ApiResponse<CacheStats>> {
  return chartermateRequest<CacheStats>(CHARTERMATE_API.CACHE.STATS);
}