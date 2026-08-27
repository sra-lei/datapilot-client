/**
 * Core Service 类型定义
 */

// 用户相关类型
export interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
  roleId?: number;
}

export interface ChangePasswordParams {
  username?: string;
  oldPassword: string;
  newPassword: string;
  force?: boolean;
}

export interface UpdateUserStatusParams {
  userId: number;
  status: 'active' | 'inactive';
}

// 权限相关类型
export interface Permission {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UserWithRoles {
  id: number;
  username: string;
  email: string | null;
  roles: Role[];
  permissions: string[];
}

// 数据库相关类型
export interface TableInfo {
  name: string;
  type: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface DatabaseStats {
  tableCount: number;
  totalRows: number;
  tableStats: Record<string, number>;
  dbFileSize: number;
  dbFilePath: string;
}

// ============ 评估集管理类型 ============

// 状态：normal=正常（默认）/ disabled=禁用（评测跳过）/ deleted=已删除（软删除）
export type EvalStatus = 'normal' | 'disabled' | 'deleted';

export interface EvalSet {
  id: number;
  name: string;
  description: string | null;
  doc_scope: string | null;
  status: EvalStatus;
  created_at?: string;
  updated_at?: string;
}

export interface EvalCase {
  id: number;
  set_id: number;
  case_id: string;
  question: string;
  expected_chapter: string | null;
  expected_keywords: string[];
  category: string;
  sort_order: number;
  status: EvalStatus;
  created_at?: string;
  updated_at?: string;
}

// 用例输入（兼容示例数据格式，用于导入/导出）
export interface EvalCaseInput {
  id: string;
  question: string;
  expected_chapter?: string | null;
  expected_keywords: string[];
  category: string;
  sort_order?: number;
}

// 评估集列表项（含统计）
export interface EvalSetListItem extends EvalSet {
  case_count: number;
  category_stats: Record<string, number>;
}

// 评估集详情（含全部用例）
export interface EvalSetDetail {
  set: EvalSet;
  cases: EvalCase[];
}

export interface EvalCaseImportFailure {
  index: number;
  id?: string;
  reason: string;
}

export interface EvalCaseImportResult {
  total: number;
  inserted: number;
  skipped: number;
  restored: number;
  failures: EvalCaseImportFailure[];
}

export interface EvalSetImportData {
  set: EvalSet;
  import_result: EvalCaseImportResult;
}

// ============ 评估统计（数据由 Core /core/stats/eval 提供） ============

// 分类统计
export interface CategoryStat {
  count: number;
  avg_score: number;
}

// 评估历史趋势项
export interface EvalHistoryItem {
  timestamp: string;
  avg_score: number;
  avg_elapsed: number;
  total: number;
  passed: number;
  category_stats: Record<string, CategoryStat>;
}

// 评估用例结果
export interface EvalCaseResult {
  id: string;
  question: string;
  score: number;
  elapsed: number;
  keywords_found: string[];
  keyword_count: number;
  source_count: number;
  has_answer: boolean;
  chapter_match: boolean;
  answer_preview: string;
  category?: string;
}

// 失败用例
export interface FailedCase {
  id: string;
  question: string;
  score: number;
}

// 评估报告摘要
export interface EvalSummary {
  total_cases: number;
  passed_count: number;
  pass_rate: string;
  avg_score: string;
  avg_elapsed: string;
  category_stats: Record<string, CategoryStat>;
  failed_cases: FailedCase[];
}

// 完整评估报告
export interface EvalReport {
  timestamp: string;
  total: number;
  passed: number;
  avg_score: number;
  avg_elapsed: number;
  summary: EvalSummary;
  results: EvalCaseResult[];
}

// /stats/eval 响应数据
export interface EvalStatsData {
  history: EvalHistoryItem[];
  latest: EvalReport | null;
}

// ============ 评估运行（结果入库，Core /core/eval/runs 提供） ============

// 运行历史列表项
export interface EvalRunListItem {
  id: number;
  set_id: number | null;
  set_name: string | null;
  doc_scope: string | null;
  status: string;
  timestamp: string | null;
  total: number;
  passed: number;
  avg_score: number;
  avg_elapsed: number;
  pass_rate: string | null;
  category_stats: Record<string, CategoryStat>;
  failed_cases: FailedCase[];
  created_at?: string;
  updated_at?: string;
}

// 运行-用例明细
export interface EvalRunCaseItem {
  id: number;
  case_id: string;
  question: string;
  score: number | null;
  elapsed: number | null;
  keywords_found: string[];
  keyword_count: number;
  source_count: number;
  has_answer: boolean;
  chapter_match: boolean | null;
  answer_preview: string | null;
  error: string | null;
}

// 单次运行详情
export interface EvalRunDetail extends EvalRunListItem {
  cases: EvalRunCaseItem[];
}

// 运行历史分页响应
export interface EvalRunListData {
  list: EvalRunListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// 批量导入逐份结果
export interface EvalRunImportItemResult {
  index: number;
  run_id?: number;
  reason?: string;
}

// 批量导入汇总结果
export interface EvalRunImportResult {
  total: number;
  inserted: number;
  failures: EvalRunImportItemResult[];
}

// 在线运行评估集的结果摘要
export interface EvalRunSetResult {
  run_id: number;
  set_id: number;
  set_name: string;
  total: number;
  passed: number;
  avg_score: number;
  avg_elapsed: number;
  failed_count: number;
}

// ============ 从已入库文档生成评估集 ============

// 文档库列表项（doc-kit /api/v1/documents）
export interface EvalDocItem {
  task_id: string;
  filename: string | null;
  paragraphs_count: number | null;
  available: boolean;
  created_at?: number | null;
}

// 文档库分页列表
export interface EvalDocListData {
  list: EvalDocItem[];
  total: number;
  page: number;
  pageSize: number;
}

// 生成评估集结果（含建集 + 导入结果 + 生成失败明细）
export interface EvalGenerateResult {
  set: EvalSet;
  import_result: EvalCaseImportResult;
  generate_failures: unknown[];
}

// ============ 任务中心（Core /core/tasks 提供） ============

// 任务类型：eval_run=运行评估集 / eval_set_generate=从文档生成评估集
export type TaskType = 'eval_run' | 'eval_set_generate';

// 任务状态：queued=排队中 / running=执行中 / success=成功 / failed=失败 / cancelled=已取消
export type TaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

// 任务（执行过程记录；成果落在 eval_sets / eval_runs，result 存关联 id 与摘要）
export interface TaskItem {
  id: number;
  task_type: TaskType;
  status: TaskStatus;
  payload: Record<string, unknown> | null;
  progress: number;
  progress_detail: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_by: number | null;
  created_at?: string;
  updated_at?: string;
  finished_at?: string | null;
}

// 任务列表分页响应
export interface TaskListData {
  list: TaskItem[];
  total: number;
  page: number;
  page_size: number;
}

// 提交任务响应（统一返回 task_id）
export interface TaskSubmitResult {
  task_id: number;
}

// 重新导出公共类型
export type { ApiResponse } from '../types';
