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
 * 从本地存储读取当前登录用户 id（与 utils/request.ts 的 coreRequest 逻辑一致），
 * 附带在 X-User-ID 头中，供 docs-seeker 做 RAG 使用统计。
 */
function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("currentUser") || localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: unknown };
      if (parsed.id != null) return String(parsed.id);
    }
  } catch {
    // 本地存储解析失败时忽略，不附带该头
  }
  return null;
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
