/**
 * Core Service 类型定义
 */

// 用户相关类型
export interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  status: "active" | "inactive" | "deleted";
  created_at: string;
  updated_at: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
  roleId?: number;
}

export interface ChangePasswordParams {
  username?: string;
  oldPassword: string;
  newPassword: string;
  force?: boolean;
}

export interface UpdateUserStatusParams {
  userId: number;
  status: "active" | "inactive";
}

// 权限相关类型
export interface Permission {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UserWithRoles {
  id: number;
  username: string;
  email: string | null;
  roles: Role[];
  permissions: string[];
}

// 数据库相关类型
export interface TableInfo {
  name: string;
  type: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface DatabaseStats {
  tableCount: number;
  totalRows: number;
  tableStats: Record<string, number>;
  dbFileSize: number;
  dbFilePath: string;
}

// 重新导出公共类型
export type { ApiResponse } from "../types";
