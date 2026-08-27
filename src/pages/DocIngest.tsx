/**
 * 文档入库（doc-kit）独立页面
 * - 上：上传面板（DocKitUploadPanel 封装好的 Steps + 探活 + 去重 + 提交）
 * - 下：入库记录列表（后端暂未提供 list 接口，目前从前端本地注册表读取；
 *        未来后端实现 /doc-kit/api/v1/documents 后，只需替换 services/doc-kit 的 listDocuments 实现）
 * - 行点击 Drawer：左侧摘要、右侧 chunks，用来直观看分块/摘要结果（后端未开放明细时展示占位提示）
 */
import {
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Collapse,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  message,
  Pagination,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DocKitUploadPanelRef } from "../components/DocKitUploadPanel";
import DocKitUploadPanel from "../components/DocKitUploadPanel";
import type {
  DocKitChunkItem,
  DocKitDocumentRecord,
  DocKitListDocumentsData,
  DocKitSummaryItem,
} from "../services/doc-kit";
import {
  DocIngestRegistry,
  INGEST_AUDIT_VERDICT_LABELS,
  auditIngest,
  getDocumentChunks,
  getDocumentSummaries,
} from "../services/doc-kit";
import { usePermission } from "../contexts/PermissionContext";

const { Text } = Typography;

// 时间戳 → yyyy-MM-dd HH:mm:ss 或 '--'
function fmtTs(ts: string | number | null | undefined): string {
  if (!ts && ts !== 0) return "--";
  const n = typeof ts === "string" ? Number(ts) : ts;
  if (!Number.isFinite(n) || n <= 0) return "--";
  try {
    // 后端/注册表用的是 Unix 秒时间戳，这里 *1000 转 ms
    return new Date(n * 1000).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return "--";
  }
}

function statusTag(status: DocKitDocumentRecord["status"]) {
  switch (status) {
    case "success":
      return <Tag color="success">入库完成</Tag>;
    case "error":
      return <Tag color="error">入库失败</Tag>;
    case "queued":
      return <Tag color="gold">排队中</Tag>;
    case "running":
    default:
      return <Tag color="processing">处理中</Tag>;
  }
}

export default function DocIngest() {
  const { token } = theme.useToken();
  // 权限门禁：文档入库（doc:ingest）与评估域分离，仅入库人员可见可操作
  const { can } = usePermission();
  const canIngest = can("ingest", "Doc");
  // 上传面板 ref：对外拿探活状态（给 Collapse Title 右侧的"重新探活"按钮用）
  const uploadPanelRef = useRef<DocKitUploadPanelRef>(null);
  // ref 的 health/healthDown 变化不会触发重渲染，用一个 tick 强制刷新 Collapse 标题的 Tag
  const [, setHealthTick] = useState(0);
  const bumpHealthUI = () => setHealthTick((t) => (t + 1) % 1_000_000);

  // 列表页状态
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DocKitListDocumentsData>({
    total: 0,
    page: 1,
    page_size: 10,
    list: [],
  });

  // 核对按钮 loading（记录正在核对的 task_id）
  const [auditLoadingId, setAuditLoadingId] = useState<string | null>(null);

  // Drawer 状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRec, setDrawerRec] = useState<DocKitDocumentRecord | null>(null);
  const [chunks, setChunks] = useState<DocKitChunkItem[]>([]);
  const [summaries, setSummaries] = useState<DocKitSummaryItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // 加载列表（统一入口）
  const reload = useCallback(
    (nextPage = page) => {
      setLoading(true);
      try {
        const result = DocIngestRegistry.list({
          keyword,
          page: nextPage,
          page_size: pageSize,
        });
        setData(result);
        if (nextPage !== page) setPage(nextPage);
      } finally {
        setLoading(false);
      }
    },
    [keyword, page, pageSize],
  );

  // 初次加载 + keyword / pageSize 变化时重置页码（保持用户规则：避免多层嵌套，用提前返回）
  useEffect(() => {
    reload(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, pageSize]);

  // 入库核对：调 /ingest/audit 按 Milvus 实际数据交叉验证，
  // 解决"轮询 2 分钟停止/进程重启后最终结果不可知"——超时后在这里确认最终结果
  const handleAudit = useCallback(
    async (rec: DocKitDocumentRecord) => {
      if (!rec.task_id) {
        message.warning("该记录没有任务 ID，无法核对");
        return;
      }
      setAuditLoadingId(rec.task_id);
      try {
        const r = await auditIngest(rec.task_id);
        if (!r.success || !r.data) {
          message.error(r.msg ?? "核对失败");
          return;
        }
        const d = r.data;
        const label = INGEST_AUDIT_VERDICT_LABELS[d.verdict] ?? d.verdict;
        const terminal =
          d.verdict === "completed_ok" ||
          d.verdict === "data_present_no_task" ||
          d.verdict === "partial" ||
          d.verdict === "task_error" ||
          d.verdict === "missing";
        const nextStatus: DocKitDocumentRecord["status"] =
          d.verdict === "completed_ok" || d.verdict === "data_present_no_task"
            ? "success"
            : d.verdict === "running" || d.verdict === "query_error"
              ? rec.status
              : "error";
        // 回写本地注册表，让列表状态与真实数据一致
        DocIngestRegistry.update(rec.task_id, {
          status: nextStatus,
          chunks_count:
            typeof d.actual_docs === "number" ? d.actual_docs : rec.chunks_count,
          summary_count:
            typeof d.actual_summaries === "number"
              ? d.actual_summaries
              : rec.summary_count,
          collection: d.collection ?? rec.collection,
          summary_collection: d.summary_collection ?? rec.summary_collection,
          finished_at: terminal ? d.finished_at ?? Date.now() / 1000 : rec.finished_at,
          error: d.error ?? (nextStatus === "error" ? label : rec.error ?? null),
        });
        reload(page);
        message.info(label);
      } catch (err) {
        console.warn("核对失败", err);
        message.error("核对失败，请稍后重试");
      } finally {
        setAuditLoadingId(null);
      }
    },
    [reload, page],
  );

  // 上传面板的 health 是 ref.getter（不会触发重渲染），每 30s 拉一次刷新标题旁的统计 Tag，
  // 最多 90s（3 次，覆盖挂载探活 + 手动点击的耗时），结束后仅保留手动 bump
  useEffect(() => {
    const id = window.setInterval(() => {
      bumpHealthUI();
    }, 30000);
    const stop = window.setTimeout(() => {
      window.clearInterval(id);
    }, 90000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, []);

  // 列表行：点击 → Drawer 详情
  const openDrawer = async (rec: DocKitDocumentRecord) => {
    setDrawerRec(rec);
    setDrawerOpen(true);
    setDetailLoading(true);
    setChunks([]);
    setSummaries([]);
    try {
      const [c, s] = await Promise.all([
        getDocumentChunks(rec.document_id),
        getDocumentSummaries(rec.document_id),
      ]);
      if (c.success) setChunks(c.data);
      if (s.success) setSummaries(s.data);
    } finally {
      setDetailLoading(false);
    }
  };

  // 清除本地注册表（临时按钮：方便调试 + 后端上线后可删掉）
  const handleClearLocal = () => {
    DocIngestRegistry.clear();
    message.success("已清空本地入库记录（不影响 Milvus 数据）");
    reload(1);
  };

  // Collapse 标题右侧的"重新探活"按钮：调用 Panel ref 的探活方法 + 同步刷新外层 Tag
  const handleReloadHealth = async () => {
    const api = uploadPanelRef.current;
    if (!api) return;
    const ok = await api.reloadHealth();
    bumpHealthUI();
    message[ok ? "success" : "error"](
      ok ? "doc-kit 服务可用" : "doc-kit 服务不可用",
    );
  };

  const columns: ColumnsType<DocKitDocumentRecord> = useMemo(
    () => [
      {
        title: "文件名",
        dataIndex: "filename",
        key: "filename",
        render: (_, r) => (
          <Space>
            <FileTextOutlined style={{ color: token.colorPrimary }} />
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => void openDrawer(r)}
              title="查看分块与摘要"
            >
              {r.filename}
            </Button>
          </Space>
        ),
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (s: DocKitDocumentRecord["status"]) => statusTag(s),
      },
      {
        title: "原文段",
        dataIndex: "chunks_count",
        key: "chunks_count",
        width: 90,
        align: "right",
        render: (v: number, r) =>
          typeof v === "number" && r.status === "success" ? v : "--",
      },
      {
        title: "摘要段",
        dataIndex: "summary_count",
        key: "summary_count",
        width: 90,
        align: "right",
        render: (v: number, r) =>
          typeof v === "number" && r.status === "success" ? v : "--",
      },
      {
        title: "集合",
        dataIndex: "collection",
        key: "collection",
        render: (v?: string) =>
          v ? <Tag>原文 {v}</Tag> : <Text type="secondary">--</Text>,
      },
      {
        title: "上传时间",
        dataIndex: "created_at",
        key: "created_at",
        width: 180,
        render: (v) => fmtTs(v),
      },
      {
        title: "完成时间",
        dataIndex: "finished_at",
        key: "finished_at",
        width: 180,
        render: (v, r) => {
          if (r.status !== "success" && r.status !== "error")
            return <Text type="secondary">--</Text>;
          return fmtTs(v);
        },
      },
      {
        title: "错误",
        dataIndex: "error",
        key: "error",
        render: (v: string | null | undefined) =>
          v ? (
            <Text type="danger" ellipsis style={{ maxWidth: 240 }} title={v}>
              {v}
            </Text>
          ) : (
            "--"
          ),
      },
      {
        title: "操作",
        key: "action",
        width: 100,
        render: (_, r) => (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={auditLoadingId === r.task_id}
            onClick={() => void handleAudit(r)}
            title="按 Milvus 实际数据核对入库结果"
          >
            核对
          </Button>
        ),
      },
    ],
    [handleAudit, auditLoadingId],
  );

  const tableDataSource = data.list.map((r) => ({ ...r, key: r.document_id }));

  if (!canIngest) {
    return (
      <div style={{ padding: "48px 0" }}>
        <Empty description="没有文档入库权限（需要 doc:ingest 权限，请联系管理员分配）" />
      </div>
    );
  }

  return (
    <div>
      {/* ============== 顶部：上传面板（可折叠，腾出更多列表空间） ============== */}
      {/* 需求对齐：
          1. 第一行 Title 右侧放"重新探活"按钮（Collapse item.extra）
          2. 内层 Panel 的 Card 不再重复写"文档入库（doc-kit）"标题行（已挪到这里）
          3. "文档上传（doc-kit）" → "文档入库（doc-kit）"
      */}
      <Collapse
        defaultActiveKey={["upload"]}
        style={{ marginBottom: 12 }}
        items={[
          {
            key: "upload",
            label: (
              <Space wrap size={12}>
                <UnorderedListOutlined />
                <strong>文档入库（doc-kit）</strong>
                {(() => {
                  const stats = uploadPanelRef.current?.health?.stats;
                  const down = uploadPanelRef.current?.healthDown ?? false;
                  if (!stats) return null as unknown as ReactNode;
                  return (
                    <Tag
                      color={down ? "error" : "green"}
                      style={{ marginLeft: 4 }}
                    >
                      原文 {stats.docs_count ?? "--"} 段 / 摘要{" "}
                      {stats.summaries_count ?? "--"} 段
                    </Tag>
                  );
                })()}
              </Space>
            ),
            extra: (
              <Button
                size="small"
                type="link"
                loading={uploadPanelRef.current?.healthLoading ?? false}
                onClick={() => void handleReloadHealth()}
                icon={<ReloadOutlined />}
              >
                重新探活
              </Button>
            ),
            children: (
              <DocKitUploadPanel
                ref={uploadPanelRef}
                onTaskComplete={() => reload(1)}
              />
            ),
          },
        ]}
      />

      {/* ============== 下方：入库记录列表 ============== */}
      <Card
        title={
          <Space>
            <UnorderedListOutlined />
            <span>入库记录</span>
            <Tag color="blue">本地存储</Tag>
          </Space>
        }
        bodyStyle={{ padding: 12 }}
        style={{ minHeight: 640 }}
        extra={
          <Space>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="按文件名搜索"
              style={{ width: 260 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Button onClick={() => reload(page)}>刷新</Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleClearLocal}
              title="仅清空前端本地记录（不会删除 Milvus 向量）"
            >
              清空本地记录
            </Button>
          </Space>
        }
      >
        {/*
          横向滚动条位置说明：
          - Table 不再配置 scroll.y → 横向滚动条挂在 <Table> 组件自身底部（紧贴最后一行）
          - 外层 wrapper 设置 max-height 做纵向溢出（整个 Table 含 header/body 一起滚），
            避免 AntD 把横滚条藏在内部 .ant-table-body 的底部（之前需要先纵向拉到底才能看到）
          - Pagination 从 Table 内拆出来独立放在"组件下方"，横滚条正好在列表与分页之间，
            用户一眼就能看到，对齐"横向滚动条放在当前组件下方"的诉求。
        */}
        <div
          className="dockit-ingest-table-scroll"
          style={{ maxHeight: 620, overflowY: "auto" }}
        >
          <Table
            rowKey="document_id"
            loading={loading}
            columns={columns}
            dataSource={tableDataSource}
            size="middle"
            scroll={{ x: 1400 }}
            locale={{
              emptyText:
                data.list.length === 0 ? (
                  <div
                    style={{
                      minHeight: 380,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无入库记录"
                    />
                  </div>
                ) : undefined,
            }}
            pagination={false}
            onRow={(r) => ({
              onClick: () => void openDrawer(r),
              style: { cursor: "pointer" },
            })}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: 12,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            marginTop: 8,
          }}
        >
          <Pagination
            current={page}
            pageSize={pageSize}
            total={data.total}
            showSizeChanger
            pageSizeOptions={["10", "20", "50", "100"]}
            showQuickJumper
            showPrevNextJumpers
            showTotal={(t: number, range?: [number, number]) =>
              `共 ${t} 条${range ? `（当前 ${range[0]}-${range[1]}）` : ""}`
            }
            onChange={(p: number, ps: number) => {
              if (ps !== pageSize) {
                setPageSize(ps);
                setPage(1);
                return;
              }
              setPage(p);
              reload(p);
            }}
          />
        </div>
      </Card>

      {/* ============== Drawer：分块 / 摘要详情 ============== */}
      <Drawer
        title={drawerRec ? `文档详情：${drawerRec.filename}` : "文档详情"}
        width={960}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          drawerRec ? (
            <Space>
              {drawerRec.task_id ? (
                <Tag>任务 ID：{drawerRec.task_id}</Tag>
              ) : null}
              {statusTag(drawerRec.status)}
            </Space>
          ) : null
        }
      >
        {drawerRec ? (
          <>
            <Descriptions
              size="small"
              column={2}
              style={{ marginBottom: 16 }}
              labelStyle={{ width: 120, color: token.colorTextSecondary }}
            >
              <Descriptions.Item label="文档 ID">
                {drawerRec.document_id}
              </Descriptions.Item>
              <Descriptions.Item label="文件名">
                {drawerRec.filename}
              </Descriptions.Item>
              <Descriptions.Item label="原文集合">
                {drawerRec.collection || "--"}
              </Descriptions.Item>
              <Descriptions.Item label="摘要集合">
                {drawerRec.summary_collection || "--"}
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">
                {fmtTs(drawerRec.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {fmtTs(drawerRec.finished_at)}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain style={{ marginTop: 0 }}>
              分块 & 摘要（占位：后端详情接口开放后自动填充）
            </Divider>

            <Tabs
              defaultActiveKey="summaries"
              size="small"
              items={[
                {
                  key: "summaries",
                  label: `章节摘要（${summaries.length}）`,
                  children: renderSummaries(
                    summaries,
                    detailLoading,
                    drawerRec,
                    token,
                  ),
                },
                {
                  key: "chunks",
                  label: `原文分块（${chunks.length}）`,
                  children: renderChunks(chunks, detailLoading, drawerRec, token),
                },
              ]}
            />
          </>
        ) : null}
      </Drawer>
    </div>
  );
}

// ---- Drawer 内：摘要 Tab ----
function renderSummaries(
  summaries: DocKitSummaryItem[],
  loading: boolean,
  rec: DocKitDocumentRecord,
  token: ReturnType<typeof theme.useToken>["token"],
) {
  if (loading) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="正在加载摘要列表…"
      />
    );
  }
  // 后端详情接口未开放 → 展示占位，提醒用户后端接口。
  if (!summaries.length) {
    return (
      <div style={{ padding: "12px 0" }}>
        {rec.status === "success" && rec.summary_count > 0 ? (
          <>
            <AlertPlaceholder
              color={token.colorWarning}
              title={`入库完成，共写入 ${rec.summary_count} 条摘要。`}
              desc={
                <>
                  目前 doc-kit 后端暂未提供摘要查询接口（
                  <Text code>
                    /doc-kit/api/v1/documents/:document_id/summaries
                  </Text>
                  ）， 因此 Drawer
                  内无法展示明细。等后端补齐后，此处会自动渲染摘要内容。
                </>
              }
            />
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              rec.status === "error"
                ? "任务失败，无摘要数据"
                : rec.status === "queued" || rec.status === "running"
                  ? "任务还在处理中，请稍后刷新"
                  : "暂无摘要数据"
            }
          />
        )}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {summaries.map((s, i) => (
        <Card
          key={s.summary_id}
          size="small"
          type="inner"
          title={
            <Space wrap>
              <Tag>{i + 1}</Tag>
              <span>{s.section_title || "未命名章节"}</span>
              {s.page_range ? (
                <Tag color="geekblue">页 {s.page_range}</Tag>
              ) : null}
            </Space>
          }
        >
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {s.summary}
          </div>
          {s.keywords?.length ? (
            <div style={{ marginTop: 8 }}>
              {s.keywords.map((k) => (
                <Tag key={k} color="blue">
                  {k}
                </Tag>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

// ---- Drawer 内：chunks Tab ----
function renderChunks(
  chunks: DocKitChunkItem[],
  loading: boolean,
  rec: DocKitDocumentRecord,
  token: ReturnType<typeof theme.useToken>["token"],
) {
  if (loading) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="正在加载分块列表…"
      />
    );
  }
  if (!chunks.length) {
    return (
      <div style={{ padding: "12px 0" }}>
        {rec.status === "success" && rec.chunks_count > 0 ? (
          <AlertPlaceholder
            color={token.colorPrimary}
            title={`入库完成，共写入 ${rec.chunks_count} 条分块。`}
            desc={
              <>
                目前 doc-kit 后端暂未提供分块查询接口（
                <Text code>/doc-kit/api/v1/documents/:document_id/chunks</Text>
                ）， 因此 Drawer 内无法展示明细。等后端补齐后，此处会自动渲染
                chunk 正文、页码、章节等信息。
              </>
            }
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              rec.status === "error"
                ? "任务失败，无分块数据"
                : rec.status === "queued" || rec.status === "running"
                  ? "任务还在处理中，请稍后刷新"
                  : "暂无分块数据"
            }
          />
        )}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {chunks.map((c, i) => (
        <Card
          key={c.chunk_id}
          size="small"
          type="inner"
          title={
            <Space wrap>
              <Tag>{i + 1}</Tag>
              <span>{c.section_title || "未命名章节"}</span>
              <Tag color="geekblue">p.{c.page}</Tag>
              {typeof c.char_index === "number" ? (
                <Tag>idx {c.char_index}</Tag>
              ) : null}
              {typeof c.tokens === "number" ? (
                <Tag color="purple">{c.tokens} tokens</Tag>
              ) : null}
            </Space>
          }
        >
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {c.content}
          </div>
        </Card>
      ))}
    </div>
  );
}

// 占位提示条（后端接口未开放时使用）
function AlertPlaceholder({
  color,
  title,
  desc,
}: {
  color: string;
  title: string;
  desc: ReactNode;
}) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        border: `1px dashed ${color}`,
        borderRadius: 8,
        padding: "12px 16px",
        backgroundColor: `${color}12`,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color,
          marginBottom: 6,
          fontSize: 13,
        }}
      >
        {title}
      </div>
      <div style={{ color: token.colorText, fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}
