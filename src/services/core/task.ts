/**
 * Core Service 任务中心服务
 * - 提交：eval-set-generate（从文档生成评估集）/ eval-run（运行评估集），立即返回 task_id
 * - 轮询：GET /core/tasks/:id（status/progress/progress_detail/result/error）
 * - 列表 / 取消
 */
import { coreRequest } from "../../utils/request";
import { CORE_API } from "./constants";
import type {
  ApiResponse,
  TaskItem,
  TaskListData,
  TaskSubmitResult,
} from "./types";

/** 提交「从文档生成评估集」任务 → {task_id} */
export async function submitEvalSetGenerateTask(body: {
  doc_id: string;
  set_name?: string;
  count?: number;
}): Promise<ApiResponse<TaskSubmitResult>> {
  return coreRequest<TaskSubmitResult>(CORE_API.TASK.SUBMIT_EVAL_SET_GENERATE, {
    method: "POST",
    body,
  });
}

/** 提交「运行评估集」任务 → {task_id} */
export async function submitEvalRunTask(
  set_id: number,
): Promise<ApiResponse<TaskSubmitResult>> {
  return coreRequest<TaskSubmitResult>(CORE_API.TASK.SUBMIT_EVAL_RUN, {
    method: "POST",
    body: { set_id },
  });
}

/** 任务列表（task_type/status 过滤 + 分页） */
export async function listTasks(params?: {
  task_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<ApiResponse<TaskListData>> {
  return coreRequest<TaskListData>(CORE_API.TASK.LIST, { params });
}

/** 任务详情（轮询用） */
export async function getTask(id: number): Promise<ApiResponse<TaskItem>> {
  return coreRequest<TaskItem>(CORE_API.TASK.DETAIL(id));
}

/** 取消任务 */
export async function cancelTask(id: number): Promise<ApiResponse<null>> {
  return coreRequest<null>(CORE_API.TASK.CANCEL(id), { method: "POST" });
}

/** 便捷：轮询任务直到进入终态（成功/失败/取消）；回调返回 false 可提前停止 */
export async function pollTask(
  taskId: number,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    onTick?: (task: TaskItem) => void;
  } = {},
): Promise<TaskItem> {
  const { intervalMs = 2000, timeoutMs = 15 * 60 * 1000, onTick } = options;
  const startedAt = Date.now();
  for (;;) {
    const res = await getTask(taskId);
    if (res.success && res.data) {
      const task = res.data;
      onTick?.(task);
      if (task.status !== "queued" && task.status !== "running") {
        return task;
      }
    }
    if (Date.now() - startedAt > timeoutMs) {
      return {
        id: taskId,
        task_type: "eval_run",
        status: "failed",
        payload: null,
        progress: 0,
        progress_detail: null,
        result: null,
        error: "轮询超时",
        created_by: null,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
