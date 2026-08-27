/**
 * Core Service 评估集服务
 */

import { coreRequest } from '../../utils/request';
import { CORE_API } from './constants';
import type {
  ApiResponse,
  EvalCaseImportResult,
  EvalCaseInput,
  EvalDocListData,
  EvalGenerateResult,
  EvalSet,
  EvalSetDetail,
  EvalSetImportData,
  EvalSetListItem,
} from './types';

/** 评估集列表（含用例数与分类分布） */
export async function listEvalSets(): Promise<ApiResponse<EvalSetListItem[]>> {
  return coreRequest(CORE_API.EVAL.SETS);
}

/** 创建评估集 */
export async function createEvalSet(params: {
  name: string;
  description?: string;
  doc_scope?: string;
}): Promise<ApiResponse<EvalSet>> {
  return coreRequest(CORE_API.EVAL.SETS, {
    method: 'POST',
    body: params,
  });
}

/** 评估集详情（含全部用例） */
export async function getEvalSet(id: number): Promise<ApiResponse<EvalSetDetail>> {
  return coreRequest(CORE_API.EVAL.SET_DETAIL(id));
}

/** 更新评估集（含状态切换 normal/disabled，改回 normal 可恢复被软删的集） */
export async function updateEvalSet(
  id: number,
  params: {
    name?: string;
    description?: string | null;
    doc_scope?: string | null;
    status?: string;
  },
): Promise<ApiResponse> {
  return coreRequest(CORE_API.EVAL.SET_DETAIL(id), {
    method: 'PUT',
    body: params,
  });
}

/** 删除评估集（软删除，级联软删除其下用例） */
export async function deleteEvalSet(id: number): Promise<ApiResponse> {
  return coreRequest(CORE_API.EVAL.SET_DETAIL(id), {
    method: 'DELETE',
  });
}

/** 批量导入用例（body 为示例数据格式数组） */
export async function addEvalCases(
  id: number,
  cases: EvalCaseInput[],
): Promise<ApiResponse<EvalCaseImportResult>> {
  return coreRequest(CORE_API.EVAL.CASES(id), {
    method: 'POST',
    body: cases,
  });
}

/** 更新单条用例（含状态切换 normal/disabled） */
export async function updateEvalCase(
  id: number,
  params: {
    case_id?: string;
    question?: string;
    expected_chapter?: string | null;
    expected_keywords?: string[];
    category?: string;
    sort_order?: number;
    status?: string;
  },
): Promise<ApiResponse> {
  return coreRequest(CORE_API.EVAL.CASE(id), {
    method: 'PUT',
    body: params,
  });
}

/** 删除单条用例（软删除） */
export async function deleteEvalCase(id: number): Promise<ApiResponse> {
  return coreRequest(CORE_API.EVAL.CASE(id), {
    method: 'DELETE',
  });
}

/** 导出评估集（示例格式 JSON 数组，只含正常用例） */
export async function exportEvalSet(id: number): Promise<ApiResponse<EvalCaseInput[]>> {
  return coreRequest(CORE_API.EVAL.SET_EXPORT(id));
}

/** 一步导入（创建评估集 + 导入用例） */
export async function importEvalSet(params: {
  name: string;
  description?: string;
  doc_scope?: string;
  cases: EvalCaseInput[];
}): Promise<ApiResponse<EvalSetImportData>> {
  return coreRequest(CORE_API.EVAL.SET_IMPORT, {
    method: 'POST',
    body: params,
  });
}

/** 文档库列表（已入库文档，供生成评估集选取；走 core 的 /doc-kit 代理，只读开放） */
export async function listEvalDocuments(params?: {
  page?: number;
  page_size?: number;
}): Promise<ApiResponse<EvalDocListData>> {
  return coreRequest(CORE_API.EVAL.DOCUMENTS, { params });
}

/** 从已入库文档生成评估集（LLM 生成 QA → 建集导用例；耗时较长，超时放宽到 10 分钟） */
export async function generateEvalSet(body: {
  doc_id: string;
  set_name?: string;
  count?: number;
}): Promise<ApiResponse<EvalGenerateResult>> {
  return coreRequest(CORE_API.EVAL.SETS_GENERATE, {
    method: 'POST',
    body,
    timeout: 10 * 60 * 1000,
  });
}
