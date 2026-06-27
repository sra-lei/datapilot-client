/**
 * 用户相关类型定义
 */

// 用户状态
export enum UserStatus {
  ACTIVE = "active", // 启用
  INACTIVE = "inactive", // 停用
  DELETED = "deleted", // 已删除
}

export interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  status?: UserStatus; // 用户状态
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
  username: string;
  oldPassword: string;
  newPassword: string;
  force?: boolean;
}

export interface UpdateUserStatusParams {
  userId: number;
  status: UserStatus;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export interface ChatMessage {
  id: number;
  sender: "user" | "agent";
  content: string;
  timestamp: string;
}
