/**
 * 统一请求工具
 * 支持从多个服务器获取数据
 * 开发环境使用 Vite 代理，生产环境使用环境变量配置的 URL
 */

import { ServerType } from "../config";
import type { ApiResponse } from "../services/types";

// 请求配置接口
export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

// 默认请求配置
const defaultConfig: RequestConfig = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
};

/**
 * 获取请求 URL
 * 开发环境：使用相对路径（通过 Vite 代理）
 * 生产环境：使用环境变量配置的完整 URL
 */
const getRequestUrl = (serverType: ServerType, path: string): string => {
  // 开发环境使用相对路径（通过 Vite 代理）
  if (import.meta.env.DEV) {
    return path; // 直接返回相对路径，如 '/core/user/login' 或 '/api/v1/health'
  }

  // 生产环境使用完整 URL
  const coreUrl =
    import.meta.env.VITE_SERVER_CORE_URL || "http://localhost:3002";
  const chartermateUrl =
    import.meta.env.VITE_SERVER_CHARTERMATE_URL || "http://localhost:8000";

  return serverType === ServerType.CHARTERMATE
    ? `${chartermateUrl}${path}`
    : `${coreUrl}${path}`;
};

/**
 * 发起请求
 * @param serverType 服务器类型
 * @param path API 路径
 * @param config 请求配置
 * @returns 响应结果
 */
export async function request<T = unknown>(
  serverType: ServerType,
  path: string,
  config: RequestConfig = {},
): Promise<ApiResponse<T>> {
  const mergedConfig: RequestConfig = { ...defaultConfig, ...config };
  const url = getRequestUrl(serverType, path);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, mergedConfig.timeout);

    const response = await fetch(url, {
      method: mergedConfig.method,
      headers: mergedConfig.headers,
      body: mergedConfig.body ? JSON.stringify(mergedConfig.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 解析响应
    const result = (await response.json()) as ApiResponse<T>;

    // 将 code/status 转换为 success 标识（兼容两种格式）
    // Core 服务：code === 200 表示成功
    // CharterMate 服务：status === 200 表示成功
    result.success = result.code === 200 || result.status === 200;

    return result;
  } catch (error) {
    console.error(`请求失败 ${url}:`, error);
    return {
      code: 500,
      message: error instanceof Error ? error.message : '请求失败',
      status: 500,
      msg: error instanceof Error ? error.message : '请求失败',
      success: false,
    };
  }
}

/**
 * Core Service 请求（Node.js Server）
 */
export const coreRequest = async <T = unknown>(
  path: string,
  config: RequestConfig = {},
): Promise<ApiResponse<T>> => {
  return request<T>(ServerType.CORE, path, config);
};

/**
 * CharterMate Service 请求（Python Server）
 */
export const chartermateRequest = async <T = unknown>(
  path: string,
  config: RequestConfig = {},
): Promise<ApiResponse<T>> => {
  return request<T>(ServerType.CHARTERMATE, path, config);
};

// 兼容旧名称（已废弃，建议使用新名称）
export const mainRequest = coreRequest;
export const businessRequest = chartermateRequest;

export default request;
