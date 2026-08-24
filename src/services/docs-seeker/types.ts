/**
 * Docs-Seeker Service（FastAPI RAG 服务）类型定义
 * 注意：docs-seeker 直接返回业务 JSON（无 {code,status,data} 包装），
 * 与 utils/request.ts 的 ApiResponse 语义不同。
 */

// 健康状态
export interface DocsSeekerHealth {
  status: string;
  milvus_connected: boolean;
  redis_connected: boolean;
}

// 引用来源文档
export interface SourceDoc {
  id?: string;
  text?: string;
  source?: string;
  chapter?: string;
  chapter_title?: string;
  section?: string;
  section_title?: string;
  score?: number;
  sources?: string[];
}

// POST /v1/chat 响应
export interface ChatResponse {
  answer: string;
  confidence?: string;
  sources?: SourceDoc[];
  cached?: boolean;
  query_decomposed?: string[] | null;
}

// ============ /v1/stats 运行指标 ============

export interface DocsSeekerStats {
  cache: CacheStats;
  llm: LLMStats;
}

// 语义缓存统计（与 docs-seeker SemanticCache.stats 对应）
export interface CacheStats {
  enabled?: boolean;
  hits: number;
  misses: number;
  hit_rate: string;
  threshold?: number;
}

// LLM 网关统计（与 docs-seeker LLMGateway.stats 对应）
export interface LLMStats {
  total_calls: number;
  success_calls: number;
  fallback_calls: number;
  circuit_state: string;
  circuit_failures: number;
}

// ============ /v1/milvus/stats Milvus 集合监控 ============

export interface MilvusIndexInfo {
  index_name?: string;
  field_name?: string;
  index_type?: string;
  metric_type?: string;
}

export interface MilvusCollectionStats {
  name: string;
  exists: boolean;
  count: number;
  dim: number | null;
  index: MilvusIndexInfo | null;
}

export interface MilvusStats {
  connected: boolean;
  server_version: string;
  collections: Record<string, MilvusCollectionStats>;
}

// ============ /v1/usage/stats RAG 使用统计 ============

export interface UsageUserStat {
  user_id: string;
  calls: number;
  success_rate: string;
}

export interface UsageStats {
  total_calls: number;
  success_calls: number;
  success_rate: string;
  active_users: number;
  users: UsageUserStat[];
}

// ============ /v1/usage/top 热门问题 ============

export interface UsageTopQuestion {
  question: string;
  count: number;
  cached: boolean;
}
