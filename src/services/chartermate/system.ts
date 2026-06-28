/**
 * CharterMate Service 系统服务
 */

import { chartermateRequest } from "../../utils/request";
import type { ApiResponse } from "../types";
import { CHARTERMATE_API } from "./constants";
import type { ServiceHealth } from "./types";

/**
 * 检查健康状态
 */
export async function checkHealth(): Promise<ApiResponse<ServiceHealth>> {
  return chartermateRequest<ServiceHealth>(CHARTERMATE_API.SYSTEM.HEALTH);
}
