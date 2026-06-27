/**
 * CharterMate Service 系统服务
 */

import { chartermateRequest } from '../../utils/request';
import { CHARTERMATE_API } from './constants';
import type { ApiResponse, ServiceHealth, BusinessUser } from './types';

/**
 * 检查健康状态
 */
export async function checkHealth(): Promise<ApiResponse<ServiceHealth>> {
  return chartermateRequest<ServiceHealth>(CHARTERMATE_API.SYSTEM.HEALTH);
}

/**
 * 获取用户列表
 */
export async function getUsers(): Promise<ApiResponse<BusinessUser[]>> {
  return chartermateRequest<BusinessUser[]>(CHARTERMATE_API.USER.LIST);
}