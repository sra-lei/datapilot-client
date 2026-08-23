# 评估集管理页面 — 页面结构文档

> 文档版本：v1.1
> 状态：已实现（v1.0 结构评审通过后按 §8 清单完成开发，见变更记录）
> 所属工程：client（知行 InsightForge 前端）
> 后端接口：services/core 评估集管理模块（`/core/eval/*`，详见 core 工程 docs/eval-set-design.md）

---

## 1. 背景与目标

### 1.1 背景

core 已提供评估集管理后端能力（10 个接口，挂载 `/core/eval`）：

- 评估集 CRUD（列表 / 创建 / 详情 / 更新 / 删除）
- 用例管理（批量导入 / 更新 / 删除）
- 导入导出（导出示例格式 JSON、一步建集+导用例）
- **三态模型**：`normal`（正常，默认，可正常使用）/ `disabled`（禁用，跑评估集时跳过该条）/ `deleted`（已删除，软删除只改状态）

### 1.2 目标

在 client 提供"评估集管理"页面，可视化维护评估集与用例，支撑"core 管集 → 导出 JSON → 评测脚本跑测 → 报告回流看板"的闭环，替代当前硬编码在 `test_chat.py` 中的维护方式。

### 1.3 页面价值

| 场景 | 之前 | 之后 |
|---|---|---|
| 增删改用例 | 手改 Python 源码 | 页面操作 |
| 暂停某条用例 | 注释代码 | 置为"禁用"，评测自动跳过 |
| 下载评测输入 | 手工拷贝 | 一键导出（只含正常用例） |
| 批量导入 | 无 | 粘贴示例 JSON 数组一步导入 |

---

## 2. 页面定位与入口

| 项 | 值 |
|---|---|
| 路由 | `/eval-sets` |
| 菜单 | 主侧边栏二级菜单「文档与评测」下（与 RAG 看板、文档入库同组，图标 `AuditOutlined`） |
| 菜单权限 | `can('read', 'Eval')`（对应后端权限 `eval:read`） |
| 与现有页面关系 | `RagDashboard`（评估看板）只读 `data/reports` 报告，本页管理评测数据源；后续可在看板加"管理评估集"入口（本期不做） |

---

## 3. 页面整体结构（Master-Detail 单页双区）

```
┌───────────────────────────────────────────────────────────────┐
│ 页头：标题「评估集管理」+ 说明文案                              │
│       [新建评估集] [一步导入] [刷新]                           │
├───────────────────────────────────────────┬───────────────────┤
│ 评估集列表（Card + Table）                │ 用例管理（Drawer） │
│ ─────────────────────────────────────     │ ───────────────────│
│ 列：名称 / 文档范围 / 状态 Tag /          │ 头部：集名 + 状态  │
│     用例数 / 分类分布 / 更新时间 / 操作    │     [批量导入] [导出]│
│ 操作：查看用例｜编辑｜禁用/启用｜删除      │ ───────────────────│
│                                          │ Table：             │
│ 交互：点击「查看用例」打开右侧 Drawer     │ 编号 / 问题 / 期望章节│
│                                          │ 关键词 / 分类 / 状态│
│                                          │ 操作：编辑｜禁用启用 │
│                                          │        ｜删除       │
└───────────────────────────────────────────┴───────────────────┘
```

- **主视图**：评估集列表（单页首屏，信息密度优先）；
- **从视图**：用例管理 Drawer（侧滑，聚焦单个评估集的用例维护）；
- 列表与 Drawer 数据隔离：Drawer 打开时按集拉取详情，不阻塞列表。

---

## 4. 功能模块拆解

### 4.1 评估集列表

| 项 | 说明 |
|---|---|
| 数据 | `GET /core/eval/sets` → `EvalSetListItem[]` |
| 触发 | 进入页面 / 点击刷新 |
| 反馈 | Table loading；空态 Empty("暂无评估集，点击右上角新建")；错误 message.error |
| 列 | 名称、文档范围、状态 Tag、用例数、分类分布（如 `事实查询 16 · 综合概括 3`）、更新时间、操作 |
| 状态 Tag | `normal`=绿"正常" / `disabled`=橙"禁用（评测跳过）"（列表不含已删除数据） |

### 4.2 新建评估集（Modal）

- Form 字段：`name`（必填，唯一）、`description`、`doc_scope`；
- 提交 `POST /core/eval/sets` → 成功 message.success + 刷新列表；
- 409 冲突提示"评估集名称已存在"。

### 4.3 编辑评估集（Modal）

- 复用 4.2 表单（回填），提交 `PUT /core/eval/sets/:id`。

### 4.4 禁用 / 启用评估集

- Popconfirm 确认（禁用提示"禁用后评估时跳过该集全部用例"）；
- `PUT /core/eval/sets/:id`，body `{ status: 'disabled' | 'normal' }`；
- 行内状态 Tag 同步切换。

### 4.5 删除评估集（软删除）

- Popconfirm，文案强调"**软删除**：仅改为已删除，数据保留"；
- `DELETE /core/eval/sets/:id`（后端级联软删其下用例）；
- 删除后列表不再展示（本期不提供"回收站/恢复"入口，恢复可经后端 `PUT` 接口，后续按需加"已删除"Tab）。

### 4.6 查看 / 管理用例（Drawer）

- 打开时 `GET /core/eval/sets/:id` → `{ set, cases }`；
- 用例 Table 列：编号、问题（截断+Tooltip）、期望章节（null 显示"跨章节"）、期望关键词（Tag 列表）、分类、状态、操作；
- 状态 Tag：`normal`=绿 / `disabled`=橙 / 已删除用例不展示（后端已过滤）。

### 4.7 批量导入用例（Modal，Drawer 内）

- 入口：Drawer 头部"批量导入"按钮；
- 交互：Modal 内 TextArea 粘贴**示例数据 JSON 数组**（兼容后端 `POST /core/eval/sets/:id/cases` body 格式），可选"从文件读取"（FileReader）；
- 提交后展示结果 Alert / Table：
  - `inserted`（新增）、`skipped`（重复且未删除，跳过）、`restored`（重复且已删除，恢复为正常）、`failures`（逐条 `index + id + reason` 明细）；
- 成功后刷新 Drawer 用例列表。

### 4.8 一步导入（Modal，列表页）

- Form：`name`（必填）+ TextArea 用例数组；
- 提交 `POST /core/eval/sets/import` → 成功跳转/刷新并打开该集用例 Drawer；
- 结果展示同 4.7。

### 4.9 导出评估集（Drawer 内按钮）

- `GET /core/eval/sets/:id/export` → 将返回数组 `JSON.stringify(…, null, 2)` 生成 Blob 下载：
  `eval-set-{集名}-{YYYYMMDD_HHmmss}.json`；
- 按钮旁提示"**仅含正常用例**（禁用/已删除不参与评测）"。

### 4.10 用例编辑（Modal）

- Form 字段：`case_id`（编号）、`question`、`expected_chapter`（可为空=跨章节）、`expected_keywords`（`Select mode="tags"` 或逗号输入转数组）、`category`（Select 四类白名单）、`sort_order`、`status`（Select normal/disabled，默认不回填为当前值）；
- 提交 `PUT /core/eval/cases/:id`。

### 4.11 用例禁用 / 启用

- 行内 Switch 或 Popconfirm；`PUT /core/eval/cases/:id`，body `{ status: 'disabled' | 'normal' }`；
- 禁用后 Tag 变橙；导出与评测自动跳过。

### 4.12 用例删除（软删除）

- Popconfirm 文案同 4.5（软删除）；`DELETE /core/eval/cases/:id`；
- 删除后从 Drawer 列表消失。

### 4.13 权限控制

- 所有写操作按钮（新建/编辑/删除/导入/导出/状态切换）按 `can('write', 'Eval')` 显隐；
- 无权限时按钮隐藏（不显示 403 弹窗，与现有页面 `can()` 用法一致）。

---

## 5. 服务层设计（新增）

### 5.1 路径常量（`src/services/core/constants.ts` 新增 `EVAL` 段）

```ts
EVAL: {
  SETS: '/core/eval/sets',
  SET_DETAIL: (id: number) => `/core/eval/sets/${id}`,
  SET_IMPORT: '/core/eval/sets/import',
  SET_EXPORT: (id: number) => `/core/eval/sets/${id}/export`,
  CASES: (id: number) => `/core/eval/sets/${id}/cases`,
  CASE: (id: number) => `/core/eval/cases/${id}`,
}
```

### 5.2 服务函数（新建 `src/services/core/evalSet.ts`）

| 函数 | 方法 / 路径 | 参数 | 返回 `data` |
|---|---|---|---|
| `listEvalSets()` | GET SETS | - | `EvalSetListItem[]` |
| `createEvalSet(params)` | POST SETS | name/description/doc_scope | `EvalSet` |
| `getEvalSet(id)` | GET SET_DETAIL | id | `EvalSetDetail` |
| `updateEvalSet(id, params)` | PUT SET_DETAIL | 部分字段 + status | - |
| `deleteEvalSet(id)` | DELETE SET_DETAIL | id | - |
| `addEvalCases(id, cases)` | POST CASES | `EvalCaseInput[]` | `EvalCaseImportResult` |
| `updateEvalCase(id, params)` | PUT CASE | 部分字段 + status | - |
| `deleteEvalCase(id)` | DELETE CASE | id | - |
| `exportEvalSet(id)` | GET SET_EXPORT | id | `EvalCaseInput[]` |
| `importEvalSet(params)` | POST SET_IMPORT | name + cases | `EvalSetImportData` |

### 5.3 类型（`src/services/core/types.ts` 新增）

```ts
export type EvalStatus = 'normal' | 'disabled' | 'deleted';
export interface EvalSet { id; name; description: string|null; doc_scope: string|null; status: EvalStatus; created_at?; updated_at?; }
export interface EvalCase { id; set_id; case_id; question; expected_chapter: string|null; expected_keywords: string[]; category; sort_order; status: EvalStatus; created_at?; updated_at?; }
export interface EvalCaseInput { id; question; expected_chapter?: string|null; expected_keywords: string[]; category; sort_order?; }
export interface EvalSetListItem extends EvalSet { case_count: number; category_stats: Record<string, number>; }
export interface EvalSetDetail { set: EvalSet; cases: EvalCase[]; }
export interface EvalCaseImportResult { total; inserted; skipped; restored; failures: { index; id?; reason }[]; }
export interface EvalSetImportData { set: EvalSet; import_result: EvalCaseImportResult; }
```

### 5.4 导出（`src/services/core/index.ts`）

`export * from './evalSet';`

---

## 6. 路由 / 菜单 / 权限改动清单

| 文件 | 改动 |
|---|---|
| `src/routes/index.tsx` | 新增 `{ path: '/eval-sets', element: <EvalSets /> }`（受保护路由 children） |
| `src/layouts/MainLayout.tsx` | 菜单项 `{ key: '/eval-sets', icon: <AuditOutlined />, label: '评估集管理', permission: { action: 'read', subject: 'Eval' } }` |
| `src/contexts/PermissionContext.tsx` | `createAbility` 增加 `case 'eval': read→can('read','Eval'); write→can('write','Eval')`（admin 的 `*` 已自动覆盖） |

---

## 7. 交互细节与边界

- **加载/空态/错误**：列表 loading + Empty + message.error，三态齐备；
- **软删除提示**：所有删除确认文案均标注"软删除，数据保留"；
- **禁用语义提示**：禁用操作确认文案标注"评测时跳过"；
- **导出仅含正常用例**：按钮 Tooltip 说明；
- **导入失败明细**：以 Table/Alert 逐条列出 `index/id/reason`，便于修正后重导；
- **编码**：请求响应统一走 `coreRequest`（已内置 UTF-8 解码），中文无乱码风险；
- **本期不做**：已删除集的"回收站/恢复"UI、RagDashboard 联动入口、Python 评测脚本改造。

---

## 8. 实施清单（文件级）

**新增**
| 文件 | 内容 |
|---|---|
| `src/pages/EvalSets.tsx` | 页面主体（列表 + Drawer + 各 Modal），约 500-700 行 |
| `src/services/core/evalSet.ts` | 10 个服务函数 |

**修改**
| 文件 | 内容 |
|---|---|
| `src/services/core/constants.ts` | 新增 `EVAL` 路径段 |
| `src/services/core/types.ts` | 新增评估集相关类型 |
| `src/services/core/index.ts` | 导出 evalSet |
| `src/routes/index.tsx` | 注册 `/eval-sets` |
| `src/layouts/MainLayout.tsx` | 菜单项 |
| `src/contexts/PermissionContext.tsx` | eval 权限映射 |

---

## 9. 验证方案

1. `npm run lint` / `npm run build` 通过；
2. 手工链路（dev：core :3002 + client vite 代理）：
   - 新建评估集 → 一步导入示例 22 条 → 列表显示 22 条与分类分布；
   - 禁用 1 条用例 → 导出 JSON 应为 21 条；
   - 编辑/删除用例与评估集（确认软删除提示）；删除后列表消失；
   - 无 `eval:write` 权限账号：写按钮隐藏；
3. 导出文件用 `test_chat.py` 同款格式比对字段一致。

---

## 10. 里程碑

| 阶段 | 内容 |
|---|---|
| M1 | 页面结构评审（本文档） |
| M2 | 服务层 + 页面开发 |
| M3 | 权限接入与联调 |
| M4 | 验收（§9 验证方案）+ RagDashboard 联动（另立项） |

---

## 11. 变更记录

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.1 | - | 已实现：新增 `src/services/core/evalSet.ts`（10 个函数）与 `src/pages/EvalSets.tsx`；`constants.ts`/`types.ts`/`index.ts` 扩展；`PermissionContext` 增加 eval 映射；`routes/index.tsx` 注册 `/eval-sets`；`MainLayout.tsx` 新增菜单；lint/tsc/vite build 通过 |
| v1.0 | - | 页面结构初稿（本文档） |
