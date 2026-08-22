/**
 * 统一请求工具
 * 开发环境使用 Vite 代理转发；生产环境使用 Nginx 反向代理转发。
 *
 * 默认行为（兼容 Core / CharterMate 现有 JSON 请求）：
 * - Content-Type: application/json
 * - body 对象/数组 → JSON.stringify
 *
 * 新增能力（文件上传 / 二进制 / FormData）：
 * - 配置项 rawBody=true：
 *   1. 不执行 JSON.stringify(body)，原样传给 fetch
 *   2. 删除默认 Content-Type 头，浏览器可根据 body 类型自动补：
 *      - FormData → multipart/form-data; boundary=...
 *      - URLSearchParams → application/x-www-form-urlencoded
 *      - Blob / File → Blob.type（若有）
 */

import { ServerType } from "../config";
import type { ApiResponse, RequestConfig as PublicRequestConfig } from "../services/types";

// 内部使用的请求配置（包含工具内部需要的字段，但不对外改变 services/types 定义）
type InternalRequestConfig = PublicRequestConfig & { timeout?: number };

// 默认请求配置
const defaultConfig: InternalRequestConfig = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
};

/**
 * 拼接 query string：RequestConfig.params → key1=a&key2=b
 * 注意：path 若已带 ?，使用 & 拼接；否则使用 ?。
 */
function appendQueryParams(path: string, params?: Record<string, string | number>): string {
  if (!params) return path;
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return path;
  const qs = entries
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  return path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`;
}

/**
 * 获取最终请求 URL
 * 开发与生产都使用相对路径，依赖 Vite 代理 / Nginx 反代。
 */
const getRequestUrl = (
  _serverType: ServerType,
  path: string,
  params?: Record<string, string | number>,
): string => {
  return appendQueryParams(path, params);
};

/**
 * 发起请求
 */
export async function request<T = unknown>(
  serverType: ServerType,
  path: string,
  config: InternalRequestConfig = {},
): Promise<ApiResponse<T>> {
  const mergedConfig: InternalRequestConfig = {
    ...defaultConfig,
    ...config,
    // headers 要做浅合并（让调用方可以覆盖/删除特定默认头）
    headers: { ...(defaultConfig.headers ?? {}), ...(config.headers ?? {}) },
  };

  // rawBody=true：删除默认 Content-Type，让浏览器根据 body 类型自动选择
  if (mergedConfig.rawBody && mergedConfig.headers) {
    // 同时兼容 content-type 与 Content-Type 键
    delete mergedConfig.headers["Content-Type"];
    delete mergedConfig.headers["content-type"];
  }

  // fetch body 参数类型：BodyInit | undefined
  let fetchBody: BodyInit | undefined;
  if (mergedConfig.body !== undefined && mergedConfig.body !== null) {
    if (mergedConfig.rawBody) {
      fetchBody = mergedConfig.body as BodyInit;
    } else {
      // 默认走 JSON：对象/数组都序列化；如果是 string，允许直接发
      fetchBody =
        typeof mergedConfig.body === "string"
          ? mergedConfig.body
          : JSON.stringify(mergedConfig.body);
    }
  }

  const url = getRequestUrl(serverType, path, mergedConfig.params);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, mergedConfig.timeout);

    const response = await fetch(url, {
      method: mergedConfig.method,
      headers: mergedConfig.headers as Record<string, string>,
      body: fetchBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 解析响应（编码安全）：
    //   强制用 UTF-8 解码 arrayBuffer → 再 JSON.parse
    //   原因：response.text() 依赖响应头 Content-Type 的 charset；当 Vite 代理 / Nginx
    //   / 反向代理剥离 charset 时，会按默认 ISO-8859-1 解码，导致中文变为典型
    //   mojibake：例如 "管理所有权限" → "æ‰€æœ‰æ�ƒé™�"
    //   与 core/src/utils/response.ts 中"显式 set charset=utf-8"形成双保险。
    let result: ApiResponse<T>;
    try {
      const buf = await response.arrayBuffer();
      const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      if (!rawText) {
        result = {
          status: response.status,
          code: response.status,
          msg: response.statusText || "",
          message: response.statusText || "",
          data: null,
        } as ApiResponse<T>;
      } else {
        try {
          result = JSON.parse(rawText) as ApiResponse<T>;
        } catch (err) {
          console.error(
            `响应 JSON 解析失败 ${url}:`,
            err,
            rawText.slice(0, 500),
          );
          result = {
            status: response.status,
            code: response.status,
            msg: rawText.slice(0, 500),
            message: rawText.slice(0, 500),
            data: null,
          } as ApiResponse<T>;
        }
      }
    } catch (err) {
      // arrayBuffer 本身失败（极少）：兜底成错误响应
      const text =
        err instanceof Error ? err.message : "响应读取失败";
      console.error(`响应读取失败 ${url}:`, err);
      result = {
        status: response.status,
        code: response.status,
        msg: text,
        message: text,
        data: null,
      } as ApiResponse<T>;
    }

    // success 双格式兼容：
    // Core：code === 200；doc-kit / chartermate：status === 200
    result.success =
      (typeof result.code === "number" && result.code >= 200 && result.code < 300) ||
      (typeof result.status === "number" && result.status >= 200 && result.status < 300);

    return result;
  } catch (error) {
    console.error(`请求失败 ${url}:`, error);
    const msg = error instanceof Error ? error.message : "请求失败";
    return {
      code: 500,
      message: msg,
      status: 500,
      msg,
      success: false,
    };
  }
}

/**
 * Core Service 请求（Node.js Server）
 */
export const coreRequest = async <T = unknown>(
  path: string,
  config: InternalRequestConfig = {},
): Promise<ApiResponse<T>> => {
  return request<T>(ServerType.CORE, path, config);
};

/**
 * CharterMate Service 请求（Python Server）
 */
export const chartermateRequest = async <T = unknown>(
  path: string,
  config: InternalRequestConfig = {},
): Promise<ApiResponse<T>> => {
  return request<T>(ServerType.CHARTERMATE, path, config);
};

/**
 * Doc-Kit Service 请求（文档解析 / 向量入库）
 */
export const docKitRequest = async <T = unknown>(
  path: string,
  config: InternalRequestConfig = {},
): Promise<ApiResponse<T>> => {
  return request<T>(ServerType.DOC_KIT, path, config);
};

// 兼容旧名称（已废弃，建议使用新名称）
export const mainRequest = coreRequest;
export const businessRequest = chartermateRequest;

export default request;
export type { InternalRequestConfig as RequestConfig };
