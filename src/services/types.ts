/**
 * 公共类型定义
 * 两个服务共享的类型
 */

// 统一响应接口
export interface ApiResponse<T = unknown> {
  status: number;
  msg: string;
  data?: T;
}

// 请求配置类型
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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