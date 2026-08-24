/**
 * 公共类型定义
 * 两个服务共享的类型
 */

// 统一响应接口（兼容 Core 与 Python 服务两种格式）
export interface ApiResponse<T = unknown> {
  // Core 服务使用的字段
  code?: number;
  message?: string;

  // 旧 Python 服务使用的字段（doc-kit / docs-seeker）
  status?: number;
  msg?: string;

  // 通用字段
  data?: T;
  success?: boolean; // 前端判断标识
}

// 请求配置类型
export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  // body 支持任意类型：
  // - 默认：对象/数组 → 内部 JSON.stringify 后发送（application/json）
  // - 传 FormData / Blob / string / URLSearchParams 时，需配合 rawBody=true，
  //   由调用方自行选择 Content-Type（传 FormData 时不要手写 Content-Type，
  //   由浏览器自动填充 multipart/form-data + boundary）
  body?: unknown;
  params?: Record<string, string | number>;
  // 原样发送 body：禁用 JSON.stringify 与默认 Content-Type 头
  rawBody?: boolean;
}

// 分页相关类型
export interface PageParams {
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
