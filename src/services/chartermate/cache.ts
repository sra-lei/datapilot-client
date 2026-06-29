/**
 * CharterMate Service 缓存服务
 */

import { chartermateRequest } from "../../utils/request";
import type { ApiResponse } from "../types";
import { CHARTERMATE_API } from "./constants";
import type { CacheStats, SemanticCacheStats } from "./types";

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<ApiResponse<CacheStats>> {
  return chartermateRequest<CacheStats>(CHARTERMATE_API.CACHE.STATS);
}

/**
 * 获取语义缓存统计信息
 */
export async function getSemanticCacheStats(): Promise<
  ApiResponse<SemanticCacheStats>
> {
  return chartermateRequest<SemanticCacheStats>(
    CHARTERMATE_API.CACHE.SEMANTIC_STATS,
  );
}
