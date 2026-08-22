/**
 * Doc-Kit Service API 客户端封装
 * 统一返回 ApiResponse<T>，便于页面层用 result.success 做分支。
 *
 * 注意：
 *  - 上传 ingest 相关接口（HEALTH / INGEST_SUBMIT / INGEST_STATUS）走真实 HTTP。
 *  - 列表 & 详情接口（listDocuments / getChunks / getSummaries）后端目前未提供路由，
 *    当前实现使用前端本地文档注册表（localStorage + 内存 ingest 任务状态），
 *    返回 ApiResponse 骨架；待后端补齐 /api/v1/documents* 后，
 *    只需替换内部实现，页面签名/类型保持不变，无破坏性改动。
 */
import { docKitRequest } from "../../utils/request";
import { DOC_KIT_API } from "./constants";
import type {
  DocKitChunkItem,
  DocKitDocumentRecord,
  DocKitHealthData,
  DocKitListDocumentsData,
  DocKitListDocumentsParams,
  DocKitSummaryItem,
  IngestStatusData,
  IngestSubmitData,
} from "./types";

export * from "./constants";
export * from "./types";

/** doc-kit 服务健康检查（上传前探活） */
export async function getDocKitHealth(): ReturnType<
  typeof docKitRequest<DocKitHealthData>
> {
  return docKitRequest<DocKitHealthData>(DOC_KIT_API.HEALTH, {
    method: "GET",
  });
}

/**
 * 提交文档 + 异步入库
 * @param file 用户选择的本地文件（目前支持 .pdf；doc-kit FitzParser.SUPPORTED_EXTENSIONS={.pdf}）
 * @param collection_suffix 可选，写集合后缀（不传则写生产主集合 chartermate_docs / chartermate_summaries）
 */
export async function uploadAndIngest(
  file: File,
  collection_suffix?: string,
): ReturnType<typeof docKitRequest<IngestSubmitData>> {
  const form = new FormData();
  form.append("file", file, file.name);
  if (collection_suffix) {
    form.append("collection_suffix", String(collection_suffix));
  }

  const result = await docKitRequest<IngestSubmitData>(
    DOC_KIT_API.INGEST_SUBMIT,
    {
      method: "POST",
      rawBody: true,
      body: form,
      // 上传 + 提交可能稍慢，放宽超时到 3 分钟；任务入库是异步的，任务完成靠轮询
      timeout: 3 * 60 * 1000,
    },
  );

  // 本地注册表记录：前端用于没有列表接口时的页面展示骨架
  if (result.success && result.data && result.data.task_id) {
    const filename = result.data.filename || file.name;
    DocIngestRegistry.add({
      document_id: result.data.task_id, // 后端未单独返回 doc_id，用 task_id 占位
      filename,
      task_id: result.data.task_id,
      collection: undefined,
      summary_collection: undefined,
      chunks_count: 0,
      summary_count: 0,
      created_at: Date.now() / 1000,
      finished_at: null,
      status: result.data.status || "queued",
      error: result.data.error || null,
    });
  }
  return result;
}

/** 按任务 ID 查询 ingest 进度（失败会返回 status=error + msg） */
export async function getIngestStatus(
  task_id: string,
): ReturnType<typeof docKitRequest<IngestStatusData>> {
  const result = await docKitRequest<IngestStatusData>(
    DOC_KIT_API.INGEST_STATUS,
    {
      method: "GET",
      params: { task_id },
      timeout: 10000,
    },
  );
  // 同步本地注册表状态，保证列表页显示与任务轮询一致
  if (result.success && result.data) {
    const s = result.data;
    DocIngestRegistry.update(s.task_id, {
      chunks_count: s.chunks_count ?? 0,
      summary_count: s.summary_count ?? 0,
      collection: s.collection,
      summary_collection: s.summary_collection,
      status: s.status,
      error: s.error || null,
      finished_at:
        s.status === "success" || s.status === "error"
          ? Date.now() / 1000
          : undefined,
    });
  }
  return result;
}

// ==========================================================================
//  列表 & 详情：前端本地注册表（后端接口占位时的降级实现）
// ==========================================================================

const LS_KEY = "dockit:ingest-registry:v1";

type StoredRecord = DocKitDocumentRecord & { __version: 1 };

function readAll(): DocKitDocumentRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredRecord[];
    if (!Array.isArray(arr)) return [];
    return arr.map(({ __version: _v, ...r }) => r as DocKitDocumentRecord);
  } catch {
    return [];
  }
}

function writeAll(list: DocKitDocumentRecord[]) {
  try {
    const saved: StoredRecord[] = list.map((r) => ({ ...r, __version: 1 }));
    // 最多保存最近 100 条，避免 localStorage 无限增长
    localStorage.setItem(LS_KEY, JSON.stringify(saved.slice(0, 100)));
  } catch {
    /* quota full：静默，下一次上传重新写入 */
  }
}

export const DocIngestRegistry = {
  add(rec: DocKitDocumentRecord): void {
    const list = readAll();
    list.unshift(rec);
    writeAll(list);
  },
  update(taskOrDocId: string, patch: Partial<DocKitDocumentRecord>): void {
    const list = readAll();
    let touched = false;
    const next = list.map((r) => {
      if (r.task_id === taskOrDocId || r.document_id === taskOrDocId) {
        touched = true;
        return { ...r, ...patch };
      }
      return r;
    });
    if (touched) writeAll(next);
  },
  list(params: DocKitListDocumentsParams = {}): DocKitListDocumentsData {
    const page = Math.max(1, params.page ?? 1);
    const page_size = Math.min(100, Math.max(1, params.page_size ?? 10));
    let list = readAll();
    if (params.keyword) {
      const k = params.keyword.trim().toLowerCase();
      list = list.filter((r) => r.filename.toLowerCase().includes(k));
    }
    if (params.collection) {
      list = list.filter((r) => r.collection === params.collection);
    }
    // 按 created_at 倒序（新上传在前）
    list = [...list].sort((a, b) => {
      const at = Number(a.created_at ?? 0);
      const bt = Number(b.created_at ?? 0);
      return bt - at;
    });
    const total = list.length;
    const start = (page - 1) * page_size;
    const paginated = list.slice(start, start + page_size);
    return { total, page, page_size, list: paginated };
  },
  clear(): void {
    localStorage.removeItem(LS_KEY);
  },
};

/**
 * 查询入库文档列表（分页）
 * 目前：前端本地注册表（按上传时间倒序，默认最近 10 条/页）
 * 未来：后端补齐路由后，改为 HTTP 调用 DOC_KIT_API.DOCUMENTS_LIST
 */
export async function listDocuments(
  params: DocKitListDocumentsParams = {},
): Promise<{
  success: true;
  data: DocKitListDocumentsData;
  code?: number;
  status?: number;
  msg?: string;
}> {
  return { success: true, data: DocIngestRegistry.list(params) };
}

/**
 * 查询某文档的 chunks 列表
 * 目前：后端未提供查询接口，返回空数组（UI 会展示 "后端暂未开放明细接口" 的占位提示）
 */
export async function getDocumentChunks(
  _document_id: string,
): Promise<{ success: true; data: DocKitChunkItem[] }> {
  return { success: true, data: [] };
}

/**
 * 查询某文档的章节摘要列表
 * 目前：后端未提供查询接口，返回空数组（UI 占位提示）
 */
export async function getDocumentSummaries(
  _document_id: string,
): Promise<{ success: true; data: DocKitSummaryItem[] }> {
  return { success: true, data: [] };
}
