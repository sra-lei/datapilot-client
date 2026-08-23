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

export async function docsSeekerFetch<T = unknown>(
  path: string,
  config: DocsSeekerRequestConfig = {},
): Promise<T> {
  const { method = "GET", body, timeout = 30000 } = config;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(path, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
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
