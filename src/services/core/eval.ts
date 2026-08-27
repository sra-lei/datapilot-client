/**
 * Core Service 评估统计与运行管理
 * - 评估数据由 Core 服务提供（/core/stats/eval）
 * - 评估运行结果入库 / 历史由 /core/eval/runs* 提供
 */
import { coreRequest } from "../../utils/request";
import { CORE_API } from "./constants";
import type {
  ApiResponse,
  EvalRunDetail,
  EvalRunImportResult,
  EvalRunListData,
  EvalStatsData,
} from "./types";

export async function getEvalStats(): Promise<ApiResponse<EvalStatsData>> {
  return coreRequest<EvalStatsData>(CORE_API.EVAL.STATS);
}

/** 导入单份评估报告（管理台上传 test_report_*.json 内容） */
export async function importEvalReport(
  body: unknown,
): Promise<ApiResponse<{ run_id: number }>> {
  return coreRequest<{ run_id: number }>(CORE_API.EVAL.RUNS, {
    method: "POST",
    body,
  });
}

/** 批量导入多份评估报告（存量回灌） */
export async function importEvalReportsBatch(
  list: unknown[],
): Promise<ApiResponse<EvalRunImportResult>> {
  return coreRequest<EvalRunImportResult>(CORE_API.EVAL.RUNS_BATCH, {
    method: "POST",
    body: list,
  });
}

/** 在线运行评估集（任务化：提交即返回 task_id，进度走任务中心轮询） */
export async function runEvalSet(
  set_id: number,
): Promise<ApiResponse<{ task_id: number }>> {
  return coreRequest<{ task_id: number }>(CORE_API.EVAL.RUN_SET(set_id), {
    method: "POST",
  });
}

/** 运行历史分页列表 */
export async function getEvalRuns(params?: {
  page?: number;
  page_size?: number;
  set_id?: number;
}): Promise<ApiResponse<EvalRunListData>> {
  return coreRequest<EvalRunListData>(CORE_API.EVAL.RUNS, { params });
}

/** 单次运行详情 */
export async function getEvalRun(id: number): Promise<ApiResponse<EvalRunDetail>> {
  return coreRequest<EvalRunDetail>(CORE_API.EVAL.RUN(id));
}

/** 删除一次运行 */
export async function deleteEvalRun(id: number): Promise<ApiResponse<null>> {
  return coreRequest<null>(CORE_API.EVAL.RUN(id), { method: "DELETE" });
}
