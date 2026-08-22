/**
 * CharterMate Service 系统服务
 */

import { chartermateRequest } from "../../utils/request";
import type { ApiResponse } from "../types";
import { CHARTERMATE_API } from "./constants";
import type { GatewayStats, ServiceHealth } from "./types";

/**
 * 检查健康状态
 */
export async function checkChartermateHealth(): Promise<ApiResponse<ServiceHealth>> {
  return chartermateRequest<ServiceHealth>(CHARTERMATE_API.SYSTEM.HEALTH);
}

/**
 * 获取网关统计信息
 */
export async function getGatewayStats(): Promise<ApiResponse<GatewayStats>> {
  return chartermateRequest<GatewayStats>(CHARTERMATE_API.GATEWAY.STATS);
}
