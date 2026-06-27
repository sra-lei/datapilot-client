/**
 * CharterMate Service 类型定义
 */

import type { ApiResponse } from '../types';

// 服务健康状态
export interface ServiceHealth {
  status: string;
  service: string;
}

// 用户相关类型
export interface BusinessUser {
  id: number;
  username: string;
  email: string | null;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  updated_at: string;
}

// 缓存统计类型
export interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: string;
  size: number;
}

// 数据库统计类型
export interface DatabaseStats {
  table_count: number;
  db_size: number;
  db_type: string;
}

// 表信息类型
export interface TableInfo {
  name: string;
  rows: number;
}

// 表结构类型
export interface TableStructure {
  table_name: string;
  columns: any[];
}

// 表数据类型
export interface TableData {
  table_name: string;
  data: any[];
  page: number;
  page_size: number;
  total: number;
}

// 重新导出公共类型
export type { ApiResponse } from '../types';