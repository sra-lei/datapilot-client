/**
 * 评估历史（结果入库后管理）
 * - 运行评估集：指定评估集在线运行评测，结果入库
 * - 列表：时间 / 平均分 / 通过率 / 平均耗时 / 评估集
 * - 操作：查看详情（抽屉）/ 删除（eval:write）
 */

import {
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { usePermission } from "../contexts/PermissionContext";
import type {
  EvalRunCaseItem,
  EvalRunDetail,
  EvalRunListItem,
  EvalRunSetResult,
  EvalSetListItem,
} from "../services/core";
import {
  deleteEvalRun,
  getEvalRun,
  getEvalRuns,
} from "../services/core";
import { listEvalSets } from "../services/core/evalSet";
import { pollTask, submitEvalRunTask } from "../services/core/task";

const PAGE_SIZE = 10;

/** 时间戳 → "08-04 16:24" / "2026-08-04 03:09" */
function formatTimestamp(ts: string | null): string {
  if (!ts) return "-";
  const m1 = ts.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
  if (m1) return `${m1[2]}-${m1[3]} ${m1[4]}:${m1[5]}`;
  const m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (m2) return `${m2[2]}-${m2[3]} ${m2[4]}:${m2[5]}`;
  return ts;
}

function getScoreColor(
  score: number,
  token: ReturnType<typeof theme.useToken>["token"],
): string {
  if (score >= 0.8) return token.colorSuccess;
  if (score >= 0.5) return token.colorWarning;
  return token.colorError;
}

function EvalRuns() {
  const [list, setList] = useState<EvalRunListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<EvalRunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 运行评估集（任务化：提交 → 关闭对话框 → 提示前往任务中心，后台轮询完成后刷新）
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [evalSets, setEvalSets] = useState<EvalSetListItem[]>([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<number | undefined>();
  const [running, setRunning] = useState(false);

  const { can } = usePermission();
  const canWrite = can("write", "Eval");
  const { token } = theme.useToken();

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getEvalRuns({ page: p, page_size: PAGE_SIZE });
      if (res.success && res.data) {
        setList(res.data.list ?? []);
        setTotal(res.data.total ?? 0);
        setPage(res.data.page ?? p);
      }
    } catch (error) {
      console.error("获取评估历史失败:", error);
      message.error("获取评估历史失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  const openRunModal = async () => {
    setRunModalOpen(true);
    setSelectedSetId(undefined);
    setSetsLoading(true);
    try {
      const res = await listEvalSets();
      if (res.success && res.data) {
        // 只保留正常/禁用状态的集（不含已删除），展示用例数
        setEvalSets(res.data.filter((s) => s.status !== "deleted"));
      } else {
        message.error(res.msg || "获取评估集列表失败");
      }
    } catch (error) {
      console.error("获取评估集列表失败:", error);
      message.error("获取评估集列表失败");
    } finally {
      setSetsLoading(false);
    }
  };

  /** 提交运行任务 → 关闭对话框 → 提示前往任务中心 → 后台轮询完成后刷新历史 */
  const startRun = async () => {
    if (!selectedSetId) {
      message.warning("请选择评估集");
      return;
    }
    setRunning(true);
    try {
      const res = await submitEvalRunTask(selectedSetId);
      if (!res.success || !res.data) {
        message.error(res.msg || "任务提交失败");
        return;
      }
      const taskId = res.data.task_id;

      // 提交成功：关闭当前对话框，轻提示前往任务中心（视觉最轻：顶部 toast 自动消失）
      setRunModalOpen(false);
      message.success(`任务 #${taskId} 已提交，可在「任务中心」查看进度`, 3);

      // 后台轮询：完成后静默刷新历史列表，仅轻提示结果（不阻塞当前页面）
      void pollTask(taskId, { intervalMs: 3000 }).then((task) => {
        if (task.status === "success" && task.result) {
          const r = task.result as unknown as EvalRunSetResult;
          fetchList(1);
          message.success(`运行 #${r.run_id} 已完成入库`, 3);
        } else if (task.status === "failed") {
          message.error(task.error || "评估运行失败", 4);
        } else if (task.status === "cancelled") {
          message.warning("评估任务已取消", 3);
        }
      });
    } catch (error) {
      console.error("运行评估失败:", error);
      message.error("评估运行失败，请稍后重试");
    } finally {
      setRunning(false);
    }
  };

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await getEvalRun(id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        message.error(res.msg || "获取详情失败");
      }
    } catch (error) {
      console.error("获取运行详情失败:", error);
      message.error("获取运行详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await deleteEvalRun(id);
    if (res.success) {
      message.success("删除成功");
      fetchList(page);
    } else {
      message.error(res.msg || "删除失败");
    }
  };

  const columns: ColumnsType<EvalRunListItem> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 70,
    },
    {
      title: "运行时间",
      key: "timestamp",
      width: 130,
      render: (_, r) => formatTimestamp(r.timestamp ?? r.created_at ?? null),
    },
    {
      title: "平均分",
      dataIndex: "avg_score",
      width: 100,
      render: (v: number) => (
        <span style={{ color: getScoreColor(v, token), fontWeight: 600 }}>
          {(v * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      title: "通过率 (≥80%)",
      key: "passed",
      width: 130,
      render: (_, r) =>
        `${r.passed}/${r.total} (${r.total > 0 ? ((r.passed / r.total) * 100).toFixed(0) : 0}%)`,
    },
    {
      title: "平均耗时",
      dataIndex: "avg_elapsed",
      width: 100,
      render: (v: number) => `${v.toFixed(2)}s`,
    },
    {
      title: "评估集",
      dataIndex: "set_name",
      render: (v: string | null) => v || "-",
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetail(r.id)}
          >
            详情
          </Button>
          {canWrite && (
            <Popconfirm
              title="确认删除该次运行？"
              description="删除后不可恢复，用例明细将一并删除"
              onConfirm={() => handleDelete(r.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const caseColumns: ColumnsType<EvalRunCaseItem> = [
    {
      title: "用例",
      dataIndex: "case_id",
      width: 80,
    },
    {
      title: "问题",
      dataIndex: "question",
      ellipsis: true,
    },
    {
      title: "得分",
      dataIndex: "score",
      width: 90,
      render: (v: number | null) =>
        v === null ? (
          <Tag color="error">异常</Tag>
        ) : (
          <Tag
            color={
              getScoreColor(v, token) === token.colorSuccess
                ? "green"
                : getScoreColor(v, token) === token.colorWarning
                  ? "orange"
                  : "red"
            }
          >
            {(v * 100).toFixed(0)}%
          </Tag>
        ),
    },
    {
      title: "耗时",
      dataIndex: "elapsed",
      width: 90,
      render: (v: number | null) => (v === null ? "-" : `${v.toFixed(2)}s`),
    },
    {
      title: "关键词命中",
      dataIndex: "keyword_count",
      width: 100,
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>评估历史</h2>
        <Space>
          {canWrite && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => void openRunModal()}
            >
              运行评估集
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => fetchList(page)}>
            刷新
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 16 } }}>
        <Table<EvalRunListItem>
          rowKey="id"
          // 行高介于 small(4px) 与 middle(8px) 之间：middle + 覆盖 cell padding-block 为 6px
          size="middle"
          style={
            {
              "--ant-table-cell-padding-block": "6px",
            } as CSSProperties
          }
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            size: "small",
            onChange: (p) => fetchList(p),
          }}
          locale={{ emptyText: <Empty description="暂无运行记录，请先运行评估集或导入评估结果" /> }}
        />
      </Card>

      {/* 运行评估集弹窗 */}
      <Modal
        title="运行评估集"
        open={runModalOpen}
        onCancel={() => {
          if (!running) setRunModalOpen(false);
        }}
        onOk={() => void startRun()}
        okText={running ? "评估中..." : "开始评估"}
        cancelText="取消"
        confirmLoading={running}
        okButtonProps={{ disabled: !selectedSetId || running }}
        width={560}
      >
        <p style={{ color: token.colorTextSecondary, marginBottom: 8 }}>
          选择评估集后开始在线评测：逐条调用 RAG 问答接口（关闭缓存），完成后结果自动入库
        </p>
        <Select<number>
          style={{ width: "100%" }}
          placeholder="请选择评估集"
          loading={setsLoading}
          value={selectedSetId}
          onChange={setSelectedSetId}
          options={evalSets.map((s) => ({
            value: s.id,
            label: `${s.name}（${s.case_count} 个用例）`,
          }))}
          disabled={running}
        />
        <Alert
          type="info"
          showIcon
          message="提交后自动关闭本窗口，可前往任务中心查看进度；完成后会在此提示。"
          style={{ marginTop: 12 }}
        />
      </Modal>

      {/* 运行详情抽屉 */}
      <Drawer
        title={detail ? `运行 #${detail.id} 详情` : "运行详情"}
        width={720}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Spin />
          </div>
        ) : (
          <>
            <Descriptions
              bordered
              size="small"
              column={2}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="运行时间">
                {formatTimestamp(detail.timestamp ?? detail.created_at ?? null)}
              </Descriptions.Item>
              <Descriptions.Item label="评估集">
                {detail.set_name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="平均分">
                <span
                  style={{
                    color: getScoreColor(detail.avg_score, token),
                    fontWeight: 600,
                  }}
                >
                  {(detail.avg_score * 100).toFixed(1)}%
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="通过率">
                {detail.passed}/{detail.total}（
                {detail.total > 0
                  ? ((detail.passed / detail.total) * 100).toFixed(1)
                  : 0}
                %）
              </Descriptions.Item>
              <Descriptions.Item label="平均耗时">
                {detail.avg_elapsed.toFixed(2)}s
              </Descriptions.Item>
              <Descriptions.Item label="失败用例">
                {detail.failed_cases?.length ?? 0} 条
              </Descriptions.Item>
            </Descriptions>
            <Table<EvalRunCaseItem>
              rowKey="id"
              columns={caseColumns}
              dataSource={detail.cases ?? []}
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}

export default EvalRuns;
