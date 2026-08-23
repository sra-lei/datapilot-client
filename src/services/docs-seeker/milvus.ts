/**
 * Docs-Seeker Service - Milvus 集合监控
 */
import type { ApiResponse } from "../types";
import { DOCS_SEEKER_API } from "./constants";
import { docsSeekerFetch } from "./request";
import type { MilvusStats } from "./types";

/**
 * 获取 Milvus 集合监控数据（在线状态 / 实体数 / 向量维度 / 索引信息）
 */
export async function getMilvusStats(): Promise<ApiResponse<MilvusStats>> {
  try {
    const data = await docsSeekerFetch<MilvusStats>(DOCS_SEEKER_API.MILVUS_STATS, {
      timeout: 20000,
    });
    return { success: true, status: 200, code: 200, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, status: 500, code: 500, message: msg, msg, data: undefined };
  }
}
