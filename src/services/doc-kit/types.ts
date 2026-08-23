/**
 * Doc-Kit Service 公共类型
 * 与服务端 src/dockit/{api/schemas,vector/*,api/tasks} 的返回字段保持一致
 */

/** /doc-kit/health -> data */
export interface DocKitHealthData {
  status: "ok" | string;
  service?: string;
  version?: string;
  collections?: {
    docs: string;
    summaries: string;
  };
  stats?: {
    docs_count?: number;
    summaries_count?: number;
  };
  [key: string]: unknown;
}

/** /doc-kit/api/v1/ingest -> data（异步任务提交响应） */
export interface IngestSubmitData {
  task_id: string;
  status: "queued" | "running" | "success" | "error";
  filename?: string;
  error?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** /doc-kit/api/v1/ingest/status?task_id=xxx -> data
 *  注意：status 字面量与 doc-kit schemas.TaskStatusLiteral 保持一致，
 *  不包含 "failed"（后端异常路径统一写入 "error"，见 routes.py L153）。
 */
export interface IngestStatusData {
  task_id: string;
  filename?: string;
  status: "queued" | "running" | "success" | "error";
  error?: string;
  // 原文分块数（入库到 chartermate_docs 集合）
  chunks_count?: number;
  // 摘要块数（入库到 chartermate_summaries 集合）
  summary_count?: number;
  // 原始集合名
  collection?: string;
  summary_collection?: string;
  // 时间戳（后端可能透传 Unix timestamp(float) 或 ISO8601 string，这里统一 unknown）
  created_at?: string | number;
  updated_at?: string | number;
  finished_at?: string | number | null;
  // 可选：分阶段耗时
  duration_ms?: {
    parse?: number;
    chunk?: number;
    embed?: number;
    summarize?: number;
    store?: number;
    total?: number;
  };
  [key: string]: unknown;
}

/** /doc-kit/api/v1/ingest/audit?task_id=xxx -> data（入库核对结果） */
export type IngestAuditVerdict =
  | "completed_ok" // 任务成功且实际条数与报告一致
  | "partial" // 任务成功但实际写入少于报告（部分失败）
  | "task_error" // 任务失败
  | "running" // 任务仍在处理中
  | "data_present_no_task" // 任务记录丢失但 Milvus 已有数据 → 实际已入库
  | "missing" // 任务记录与数据都不存在 → 未入库
  | "query_error"; // Milvus 核对查询失败，无法验证

export interface IngestAuditData {
  task_id: string;
  /** queued / running / success / error / unknown */
  task_status: string;
  verdict: IngestAuditVerdict;
  collection?: string;
  summary_collection?: string;
  reported_chunks?: number | null;
  reported_summaries?: number | null;
  actual_docs?: number | null;
  actual_summaries?: number | null;
  created_at?: number | null;
  finished_at?: number | null;
  duration_seconds?: number | null;
  error?: string | null;
  [key: string]: unknown;
}

export const INGEST_AUDIT_VERDICT_LABELS: Record<IngestAuditVerdict, string> = {
  completed_ok: "核对一致：已完成入库",
  partial: "部分入库（实际条数少于报告，请重试）",
  task_error: "任务已失败",
  running: "任务仍在处理中",
  data_present_no_task: "数据已在库中（任务记录已丢失）",
  missing: "未发现入库数据",
  query_error: "核对查询失败，无法验证",
} as const;

/** 上传时展示的 Steps 阶段（前端内部映射状态） */
export type IngestStepKey =
  | "queued"
  | "parsing"
  | "chunking_embedding"
  | "summarizing"
  | "storing"
  | "done"
  | "error";

export const INGEST_STEP_LABELS: Record<IngestStepKey, string> = {
  queued: "任务已提交，排队中",
  parsing: "解析文档内容",
  chunking_embedding: "智能分块与向量化",
  // summarizing 在后端无独立 signal，前端基于 tick 做轻量过渡（4s 左右）；
  // 文案附加 "(或入库中)" 避免用户误以为入库慢。
  summarizing: "生成章节摘要",
  storing: "入向量库",
  done: "入库完成",
  error: "入库失败",
} as const;

// ==========================================================================
//  以下为 "文档列表 + 分块详情"（未来接口类型占位）
//  - 字段结构对齐 doc-kit vector store 的 Milvus schema 字段
//  - 服务端目前未提供 /api/v1/documents* 路由，对应 index.ts 的 API 默认
//    返回空数组/空对象，方便页面先出 UI 骨架；后端补齐后只需修改实现函数。
// ==========================================================================

/** 文档入库记录（列表页主行） */
export interface DocKitDocumentRecord {
  document_id: string; // Milvus 侧同一文档的 doc_id（按文件名+上传时间生成）
  filename: string; // 原始文件名（来自 upload 的 file.name）
  task_id?: string; // 对应 ingest 任务（可为空：历史离线导入的文档）
  collection?: string; // 写入的原文集合名（通常 chartermate_docs）
  summary_collection?: string; // 写入的摘要集合名（通常 chartermate_summaries）
  chunks_count: number; // 原文分块数（可从 Milvus count 查询）
  summary_count: number; // 章节摘要块数
  // 上传/入库时间（Unix timestamp 秒，兼容 string/number；后端未返回时由前端本地填充）
  created_at?: string | number | null;
  finished_at?: string | number | null;
  status: IngestStatusData["status"]; // queued/running/success/error（本地任务状态映射）
  error?: string | null;
}

/** 列表页分页参数（保持与 chartermate 的分页语义一致：page 从 1 开始） */
export interface DocKitListDocumentsParams {
  page?: number;
  page_size?: number;
  keyword?: string; // 按文件名模糊搜索（后端占位，前端本地先做 filter）
  collection?: string; // 按集合过滤
}

/** 列表页分页响应（沿用全局 ApiResponse.data 外层，这里声明分页 inner） */
export interface DocKitListDocumentsData {
  total: number;
  page: number;
  page_size: number;
  list: DocKitDocumentRecord[];
}

/** 单个 chunk 记录（= Milvus 中 chartermate_docs 集合的一条 entity，做展示简化） */
export interface DocKitChunkItem {
  chunk_id: string; // Milvus entity pk
  document_id: string; // 所属文档
  section_title?: string; // 所属章节标题（来自 parser 的 section_title 字段）
  page: number; // 来源页（来自 parser 的 page 字段）
  content: string; // chunk 原文（Milvus metadata.text）
  char_index?: number; // 原文起始字符索引（可选）
  tokens?: number; // 估算 token 数（可选）
}

/** 单个摘要记录（= Milvus chartermate_summaries 集合的一条 entity） */
export interface DocKitSummaryItem {
  summary_id: string;
  document_id: string;
  section_title?: string;
  page_range?: string; // 对应原文页码区间，例如 "1-3"
  summary: string; // 摘要正文（LLM 生成）
  keywords?: string[]; // 可选：关键词（来自 parser 或 LLM）
}
