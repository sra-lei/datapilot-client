/**
 * Docs-Seeker Service - RAG 使用统计（按用户维度）
 */
import type { ApiResponse } from "../types";
import { DOCS_SEEKER_API } from "./constants";
import { docsSeekerFetch } from "./request";
import type { UsageStats } from "./types";

/**
 * 获取 RAG 使用统计（总次数 / 成功率 / 活跃用户 / 用户 Top）
 */
export async function getRagUsageStats(): Promise<ApiResponse<UsageStats>> {
  try {
    const data = await docsSeekerFetch<UsageStats>(DOCS_SEEKER_API.USAGE_STATS, {
      timeout: 15000,
    });
    return { success: true, status: 200, code: 200, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, status: 500, code: 500, message: msg, msg, data: undefined };
  }
}
