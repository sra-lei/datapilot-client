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

// 语义缓存统计类型
export interface SemanticCacheStats {
  hits: number;
  misses: number;
  hit_rate: string;
  threshold: number;
}

// 网关统计类型
export interface GatewayStats {
  total_calls: number;
  success_calls: number;
  fallback_calls: number;
  circuit_state: string;
  circuit_failures: number;
}

// ============ 评估集相关类型 ============

// 分类统计
export interface CategoryStat {
  count: number;
  avg_score: number;
}

// 评估历史趋势项
export interface EvalHistoryItem {
  timestamp: string;
  avg_score: number;
  avg_elapsed: number;
  total: number;
  passed: number;
  category_stats: Record<string, CategoryStat>;
}

// 评估用例结果
export interface EvalCaseResult {
  id: string;
  question: string;
  score: number;
  elapsed: number;
  keywords_found: string[];
  keyword_count: number;
  source_count: number;
  has_answer: boolean;
  chapter_match: boolean;
  answer_preview: string;
  category?: string;
}

// 失败用例
export interface FailedCase {
  id: string;
  question: string;
  score: number;
}

// 评估报告摘要
export interface EvalSummary {
  total_cases: number;
  passed_count: number;
  pass_rate: string;
  avg_score: string;
  avg_elapsed: string;
  category_stats: Record<string, CategoryStat>;
  failed_cases: FailedCase[];
}

// 完整评估报告
export interface EvalReport {
  timestamp: string;
  total: number;
  passed: number;
  avg_score: number;
  avg_elapsed: number;
  summary: EvalSummary;
  results: EvalCaseResult[];
}

// /stats/eval 响应数据
export interface EvalStatsData {
  history: EvalHistoryItem[];
  latest: EvalReport | null;
}
