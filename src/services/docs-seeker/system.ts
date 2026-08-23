/**
 * Docs-Seeker Service 系统服务
 */
import type { ApiResponse } from "../types";
import { DOCS_SEEKER_API } from "./constants";
import { docsSeekerFetch } from "./request";
import type { DocsSeekerHealth } from "./types";

/**
 * 检查服务健康状态（包装为 ApiResponse 以兼容现有页面判断）
 */
export async function checkDocsSeekerHealth(): Promise<ApiResponse<DocsSeekerHealth>> {
  try {
    const data = await docsSeekerFetch<DocsSeekerHealth>(DOCS_SEEKER_API.HEALTH, {
      timeout: 10000,
    });
    return { success: true, status: 200, code: 200, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, status: 500, code: 500, message: msg, msg, data: undefined };
  }
}
