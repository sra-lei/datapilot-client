/**
 * Docs-Seeker Service（FastAPI RAG 服务）API 路径常量
 * 开发/生产均走相对路径，由 Vite 代理 / Nginx 反代转发到 docs-seeker（默认 8001）
 */
export const DOCS_SEEKER_API = {
  // 问答：检索 + LLM 生成（一次性返回，非流式）
  CHAT: "/v1/chat",
  // 纯检索
  RETRIEVE: "/v1/retrieve",
  // 健康检查
  HEALTH: "/v1/health",
  // 运行指标（语义缓存 + LLM 网关）
  STATS: "/v1/stats",
  // Milvus 集合监控
  MILVUS_STATS: "/v1/milvus/stats",
} as const;
