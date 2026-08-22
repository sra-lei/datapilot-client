/**
 * Doc-Kit Service API 路径常量
 * 与服务端 doc-kit 路由前缀方案 B 保持一致：/<service_name>/api/v1/...
 */

export const DOC_KIT_API = {
  // 健康检查
  HEALTH: "/doc-kit/health",

  // 提交上传文档 → 异步 ingest（解析/分块/向量化/摘要入库）
  INGEST_SUBMIT: "/doc-kit/api/v1/ingest",

  // 按任务 ID 查询 ingest 进度
  INGEST_STATUS: "/doc-kit/api/v1/ingest/status",

  // 列表：按文档 ID 查询原文 chunks（后端占位，待 doc-kit 实现后再对调真实实现）
  DOCUMENT_CHUNKS: "/doc-kit/api/v1/documents/:document_id/chunks",

  // 列表：按文档 ID 查询章节摘要
  DOCUMENT_SUMMARIES: "/doc-kit/api/v1/documents/:document_id/summaries",

  // 列表：文档入库记录（分页）
  DOCUMENTS_LIST: "/doc-kit/api/v1/documents",
} as const;
