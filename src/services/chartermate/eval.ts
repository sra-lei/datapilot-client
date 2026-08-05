/**
 * CharterMate Service 评估服务
 */

import { chartermateRequest } from "../../utils/request";
import type { ApiResponse } from "../types";
import { CHARTERMATE_API } from "./constants";
import type { EvalStatsData } from "./types";

/**
 * 获取评估集历史趋势与最新详情
 */
export async function getEvalStats(): Promise<ApiResponse<EvalStatsData>> {
  return chartermateRequest<EvalStatsData>(CHARTERMATE_API.EVAL.STATS);
}
