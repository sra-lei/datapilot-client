/**
 * Docs-Seeker Service 运行指标（/v1/stats）
 * 提供完整指标 + 三个兼容旧接口签名的切片函数（内部都调同一 /v1/stats）。
 */
import type { ApiResponse } from "../types";
import { DOCS_SEEKER_API } from "./constants";
import { docsSeekerFetch } from "./request";
import type { CacheStats, DocsSeekerStats, LLMStats } from "./types";

async function fetchStats(): Promise<DocsSeekerStats> {
  return docsSeekerFetch<DocsSeekerStats>(DOCS_SEEKER_API.STATS);
}

async function wrap<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    return { success: true, status: 200, code: 200, data: await fn() };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, status: 500, code: 500, message: msg, msg, data: undefined };
  }
}

/** 完整运行指标（语义缓存 + LLM 网关） */
export async function getDocsSeekerStats(): Promise<ApiResponse<DocsSeekerStats>> {
  return wrap<DocsSeekerStats>(() => fetchStats());
}

/** 缓存统计（兼容旧 getCacheStats 签名） */
export async function getCacheStats(): Promise<ApiResponse<CacheStats>> {
  return wrap<CacheStats>(async () => (await fetchStats()).cache);
}

/** 网关统计（兼容旧 getGatewayStats 签名） */
export async function getGatewayStats(): Promise<ApiResponse<LLMStats>> {
  return wrap<LLMStats>(async () => (await fetchStats()).llm);
}

/** 语义缓存统计（兼容旧 getSemanticCacheStats 签名） */
export async function getSemanticCacheStats(): Promise<ApiResponse<CacheStats>> {
  return wrap<CacheStats>(async () => (await fetchStats()).cache);
}
