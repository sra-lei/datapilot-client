/**
 * CharterMate Service 数据库服务
 */

import { chartermateRequest } from '../../utils/request';
import { CHARTERMATE_API } from './constants';
import type { ApiResponse, DatabaseStats, TableInfo, TableStructure, TableData } from './types';

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<ApiResponse<DatabaseStats>> {
  return chartermateRequest<DatabaseStats>(CHARTERMATE_API.DATABASE.STATS);
}

/**
 * 获取数据库表列表
 */
export async function getTables(): Promise<ApiResponse<TableInfo[]>> {
  return chartermateRequest<TableInfo[]>(CHARTERMATE_API.DATABASE.TABLES);
}

/**
 * 获取表结构
 */
export async function getTableStructure(
  tableName: string
): Promise<ApiResponse<TableStructure>> {
  return chartermateRequest<TableStructure>(
    CHARTERMATE_API.DATABASE.GET_TABLE_STRUCTURE(tableName)
  );
}

/**
 * 获取表数据
 */
export async function getTableData(
  tableName: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<TableData>> {
  return chartermateRequest<TableData>(
    CHARTERMATE_API.DATABASE.GET_TABLE_DATA(tableName) + `?page=${page}&page_size=${pageSize}`
  );
}

/**
 * 执行 SQL 查询
 */
export async function executeQuery(
  query: string
): Promise<ApiResponse<{ result: any[] }>> {
  return chartermateRequest<{ result: any[] }>(CHARTERMATE_API.DATABASE.QUERY, {
    method: 'POST',
    body: { query },
  });
}