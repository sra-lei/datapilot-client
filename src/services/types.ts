/**
 * 公共类型定义
 * 两个服务共享的类型
 */

// 统一响应接口（兼容 Core 和 CharterMate 两种格式）
export interface ApiResponse<T = unknown> {
  // Core 服务使用的字段
  code?: number;
  message?: string;

  // CharterMate 服务使用的字段（旧格式）
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
  body?: Record<string, unknown>;
  params?: Record<string, string | number>;
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
