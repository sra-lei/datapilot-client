/**
 * Core Service 评估统计
 * 评估数据由 Core 服务提供（/core/stats/eval）
 */
import { coreRequest } from "../../utils/request";
import { CORE_API } from "./constants";
import type { ApiResponse, EvalStatsData } from "./types";

export async function getEvalStats(): Promise<ApiResponse<EvalStatsData>> {
  return coreRequest<EvalStatsData>(CORE_API.EVAL.STATS);
}
