/**
 * Docs-Seeker Service 内部请求工具
 * docs-seeker（FastAPI）直接返回业务 JSON（无 {code,status,msg,data} 包装），
 * 与 utils/request.ts 的 ApiResponse 语义不兼容，故在此独立封装。
 * 编码处理与 utils/request.ts 保持一致（arrayBuffer + UTF-8 解码，避免代理剥离 charset 后乱码）。
 */

interface DocsSeekerRequestConfig {
  method?: "GET" | "POST";
  body?: unknown;
  timeout?: number;
}

/**
 * 匿名用户标识：未登录时生成一个 uuid 并持久化到 localStorage，复用于 RAG 使用统计。
 * 优先使用 crypto.randomUUID（secure context：https / localhost），不支持时降级随机串。
 */
function getAnonymousId(): string {
  const KEY = "rag_anonymous_id";
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return "";
  }
}

/**
 * 从本地存储读取当前用户 id（与 utils/request.ts 的 coreRequest 逻辑一致），
 * 附带在 X-User-ID 头中，供 docs-seeker 做 RAG 使用统计。
 * 登录用户取真实 id；未登录（无需登录即可使用 chat）时生成/复用匿名 uuid。
 */
function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: unknown };
      if (parsed.id != null) return String(parsed.id);
    }
  } catch {
    // 本地存储解析失败时忽略
  }
  return getAnonymousId() || null;
}

export async function docsSeekerFetch<T = unknown>(
  path: string,
  config: DocsSeekerRequestConfig = {},
): Promise<T> {
  const { method = "GET", body, timeout = 30000 } = config;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const userId = getCurrentUserId();
  if (userId) headers["X-User-ID"] = userId;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const buf = await response.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return (text ? JSON.parse(text) : null) as T;
  } finally {
    clearTimeout(timer);
  }
}
