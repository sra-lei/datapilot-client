/**
 * 仪表盘页面 - 三端服务概览样式对齐
 * 对齐基准：Doc-Kit 卡片骨架（title + 右上角刷新按钮 + Spin + 状态 Tag + Descriptions 列表）
 * Core / Docs-Seeker / Doc-Kit 三张卡共享完全一致的：
 *   - Card props：title / extra / hoverable / style (minHeight)
 *   - 内容节奏：Status Tag (marginBottom:12) → Descriptions (labelStyle 110px宽 + #888色)
 *   - 响应式栅格：xs=24 md=8
 */

import { DatabaseOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { checkCoreHealth } from "../services/core";
import type { DocKitHealthData } from "../services/doc-kit";
import { getDocKitHealth } from "../services/doc-kit";
import {
  checkDocsSeekerHealth,
  getCacheStats,
  getMilvusStats,
  getRagUsageStats,
} from "../services/docs-seeker";
import type {
  CacheStats,
  MilvusCollectionStats,
  MilvusStats,
  UsageStats,
  UsageUserStat,
} from "../services/docs-seeker";

const { Text } = Typography;

// ---------------------------------------------------------------
//  三卡共享的设计 tokens（单一基准，避免 inline 零散重复）
// ---------------------------------------------------------------
const cardStyle = { minHeight: 400, height: "100%" } as const;
const descriptionsConfig = {
  size: "small" as const,
  column: 1,
  labelStyle: { width: 110, color: "#888" },
} as const;
const statusTagStyle = { marginBottom: 12 } as const;

// ---------------------------------------------------------------
//  共用小组件：<ServiceStatusTag/> —— 对齐 Doc-Kit 的 Tag 样式
// ---------------------------------------------------------------
interface ServiceStatusTagProps {
  checking: boolean;
  down: boolean;
  okText?: string;
  downText?: string;
}

function ServiceStatusTag({
  checking,
  down,
  okText = "服务正常",
  downText = "不可达",
}: ServiceStatusTagProps) {
  if (checking) {
    return (
      <Tag color="gold" style={statusTagStyle}>
        <Spin size="small" /> 检测中…
      </Tag>
    );
  }
  return (
    <Tag color={down ? "error" : "success"} style={statusTagStyle}>
      {down ? downText : okText}
    </Tag>
  );
}

// 把 Date | null 格式化为 "HH:MM:SS"；返回 '--' 兜底
const fmt = (d: Date | null): string =>
  d ? d.toLocaleTimeString("zh-CN", { hour12: false }) : "--";

// ===============================================================
//  RAG 使用统计面板（按用户维度：次数 / 成功率 / 活跃用户 / Top）
// ===============================================================
function RagUsagePanel({
  data,
  loading,
  onRefresh,
}: {
  data: UsageStats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const successRate = parseFloat(data?.success_rate || "0") || 0;

  const columns = [
    { title: "用户", dataIndex: "user_id", key: "user_id" },
    {
      title: "调用次数",
      dataIndex: "calls",
      key: "calls",
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>{v}</span>
      ),
      sorter: (a: UsageUserStat, b: UsageUserStat) => a.calls - b.calls,
    },
    {
      title: "成功率",
      dataIndex: "success_rate",
      key: "success_rate",
      render: (v: string) => {
        const pct = parseFloat(v) || 0;
        const color = pct >= 90 ? "#52c41a" : pct >= 70 ? "#faad14" : "#ff4d4f";
        return <span style={{ color, fontWeight: 600 }}>{v}</span>;
      },
    },
  ];

  return (
    <Card
      title={
        <>
          <DatabaseOutlined /> RAG 使用统计
        </>
      }
      style={{ height: "100%" }}
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          刷新
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Statistic title="总调用次数" value={data?.total_calls ?? 0} />
          </Col>
          <Col span={8}>
            <Statistic
              title="成功率"
              value={data?.success_rate ?? "0.0%"}
              valueStyle={{ color: successRate >= 90 ? "#52c41a" : "#faad14" }}
            />
          </Col>
          <Col span={8}>
            <Statistic title="活跃用户" value={data?.active_users ?? 0} />
          </Col>
        </Row>
        <Table
          rowKey="user_id"
          size="small"
          columns={columns}
          dataSource={data?.users ?? []}
          pagination={false}
          locale={{ emptyText: "暂无使用数据" }}
        />
      </Spin>
    </Card>
  );
}

// 缓存统计的环形图（保留原 SVG 实现，但封装 + 居中）
function CacheHitRing({ rate }: { rate: string }) {
  const pct = parseFloat(rate) || 0;
  const color = pct >= 80 ? "#52c41a" : pct >= 50 ? "#faad14" : "#ff4d4f";
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        width: "100%",
      }}
    >
      <div
        style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth={6}
          />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{
              strokeDasharray: `${(pct / 100) * C} ${C}`,
              transition: "stroke-dasharray 0.5s ease",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#1890ff",
              lineHeight: 1.2,
            }}
          >
            {isNaN(pct) ? "--" : rate}
          </div>
          <div style={{ fontSize: 10, color: "#888" }}>命中率</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flex: 1, flexWrap: "wrap" }}>
        <StatCell label="命中" value={null} valueColor="#52c41a" />
        <StatCell label="未命中" value={null} valueColor="#ff4d4f" />
        <StatCell label="缓存量" value={null} valueColor="#1890ff" />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: ReactNode;
  valueColor?: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: valueColor ?? "inherit",
        }}
      >
        {value ?? "--"}
      </div>
      <div style={{ fontSize: 10, color: "#888" }}>{label}</div>
    </div>
  );
}

// ===============================================================
//  Milvus 监控面板（集合级：在线状态 / 实体数 / 维度 / 索引）
// ===============================================================
function MilvusCollectionBlock({
  label,
  stat,
}: {
  label: string;
  stat?: MilvusCollectionStats;
}) {
  if (!stat) {
    return (
      <div style={{ color: "#bbb", marginBottom: 12 }}>
        {label}：暂无数据
      </div>
    );
  }
  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Text strong>{label}</Text>
        <Tag color={stat.exists ? "success" : "error"}>
          {stat.exists ? "存在" : "缺失"}
        </Tag>
        {stat.exists && stat.count >= 0 && (
          <Tag color="blue">{stat.count} 条</Tag>
        )}
      </Space>
      {stat.exists && (
        <Descriptions
          size="small"
          column={2}
          labelStyle={{ width: 60, color: "#888" }}
          contentStyle={{ whiteSpace: "nowrap" }}
        >
          <Descriptions.Item label="向量维度">
            {stat.dim ?? "--"}
          </Descriptions.Item>
          <Descriptions.Item label="索引类型">
            {stat.index?.index_type || "--"}
          </Descriptions.Item>
          <Descriptions.Item label="度量">
            {stat.index?.metric_type || "--"}
          </Descriptions.Item>
          <Descriptions.Item label="索引字段">
            {stat.index?.field_name || "--"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}

function MilvusMonitorPanel({
  data,
  loading,
  onRefresh,
}: {
  data: MilvusStats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card
      title={
        <>
          <DatabaseOutlined /> Milvus 监控
        </>
      }
      style={{ height: "100%" }}
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          刷新
        </Button>
      }
    >
      <Spin spinning={loading}>
        <ServiceStatusTag
          checking={loading}
          down={!data?.connected}
          okText="已连接"
          downText="未连接"
        />
        <Descriptions {...descriptionsConfig}>
          <Descriptions.Item label="服务版本">
            {data?.server_version || "--"}
          </Descriptions.Item>
        </Descriptions>
        <Divider style={{ margin: "8px 0" }} />
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <MilvusCollectionBlock
              label="原文集合"
              stat={data?.collections?.docs}
            />
          </Col>
          <Col xs={24} lg={12}>
            <MilvusCollectionBlock
              label="摘要集合"
              stat={data?.collections?.summaries}
            />
          </Col>
        </Row>
      </Spin>
    </Card>
  );
}

// ---------------------------------------------------------------
//  数据类型
// ---------------------------------------------------------------
// （CacheStats 类型已由 ../services/docs-seeker 提供，本地不再重复定义）

// ===============================================================
//  主组件
// ===============================================================
function Dashboard() {
  // ------- Core -------
  const [coreChecking, setCoreChecking] = useState(true);
  const [coreDown, setCoreDown] = useState(false);
  const [coreLastCheck, setCoreLastCheck] = useState<Date | null>(null);

  // ------- CharterMate -------
  const [cmChecking, setCmChecking] = useState(true);
  const [cmDown, setCmDown] = useState(false);
  const [cmLastCheck, setCmLastCheck] = useState<Date | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // ------- Doc-Kit -------
  const [dkChecking, setDkChecking] = useState(true);
  const [dkDown, setDkDown] = useState(false);
  const [dkHealth, setDkHealth] = useState<DocKitHealthData | null>(null);

  // ------- Milvus -------
  const [milvusData, setMilvusData] = useState<MilvusStats | null>(null);
  const [milvusLoading, setMilvusLoading] = useState(false);

  // ------- RAG 使用统计 -------
  const [usageData, setUsageData] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // ------- 刷新函数 -------
  const refreshCore = async () => {
    setCoreChecking(true);
    let down = true;
    try {
      const data = await checkCoreHealth();
      down = data.data?.status !== "ok";
    } finally {
      setCoreDown(down);
      setCoreLastCheck(new Date());
      setCoreChecking(false);
    }
  };

  const refreshChartermate = async () => {
    setCmChecking(true);
    let down = true;
    try {
      const r = await checkDocsSeekerHealth();
      down = !(r.success && r.data && r.data.status === "ok");
    } finally {
      setCmDown(down);
      setCmLastCheck(new Date());
    }
    // 缓存统计：成功与否都不影响 checking 收尾
    try {
      const sr = await getCacheStats();
      if (sr.success && sr.data) setCacheStats(sr.data);
    } catch {
      /* ignore */
    } finally {
      setCmChecking(false);
    }
  };

  const refreshDockit = async () => {
    setDkChecking(true);
    try {
      const r = await getDocKitHealth();
      const ok = !!r.success && (r.data as any)?.status === "ok";
      setDkDown(!ok);
      setDkHealth((r.data as DocKitHealthData) ?? null);
    } catch {
      setDkDown(true);
      setDkHealth(null);
    } finally {
      setDkChecking(false);
    }
  };

  const refreshMilvus = async () => {
    setMilvusLoading(true);
    try {
      const r = await getMilvusStats();
      if (r.success && r.data) setMilvusData(r.data);
    } catch {
      /* ignore */
    } finally {
      setMilvusLoading(false);
    }
  };

  const refreshUsage = async () => {
    setUsageLoading(true);
    try {
      const r = await getRagUsageStats();
      if (r.success && r.data) setUsageData(r.data);
    } catch {
      /* ignore */
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    void refreshCore();
    void refreshChartermate();
    void refreshDockit();
    void refreshMilvus();
    void refreshUsage();
  }, []);

  // ===============================================================
  //  渲染
  // ===============================================================
  return (
    <div>
      <Row gutter={16}>
        {/* ====== 1. Core 服务概览（对齐 Doc-Kit 骨架） ====== */}
        <Col xs={24} md={8} style={{ marginBottom: 16 }}>
          <Card
            title="Core 服务概览"
            hoverable
            style={cardStyle}
            extra={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => void refreshCore()}
                loading={coreChecking}
              >
                刷新
              </Button>
            }
          >
            <Spin spinning={coreChecking}>
              <ServiceStatusTag checking={coreChecking} down={coreDown} />
              <Descriptions {...descriptionsConfig}>
                <Descriptions.Item label="服务名">
                  Core Service
                </Descriptions.Item>
                <Descriptions.Item label="服务职责">
                  状态监控服务
                </Descriptions.Item>
                <Descriptions.Item label="版本">--</Descriptions.Item>
                <Descriptions.Item label="最后检查">
                  {fmt(coreLastCheck)}
                </Descriptions.Item>
              </Descriptions>
            </Spin>
          </Card>
        </Col>

        {/* ====== 2. Docs-Seeker 服务概览（对齐 Doc-Kit 骨架） ====== */}
        <Col xs={24} md={8} style={{ marginBottom: 16 }}>
          <Card
            title="Docs-Seeker 服务概览"
            hoverable
            style={cardStyle}
            extra={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => void refreshChartermate()}
                loading={cmChecking}
              >
                刷新
              </Button>
            }
          >
            <Spin spinning={cmChecking}>
              <ServiceStatusTag checking={cmChecking} down={cmDown} />
              <Descriptions {...descriptionsConfig}>
                <Descriptions.Item label="服务名">
                  Docs-Seeker
                </Descriptions.Item>
                <Descriptions.Item label="服务职责">
                  RAG 检索 + LLM 问答
                </Descriptions.Item>
                <Descriptions.Item label="最后检查">
                  {fmt(cmLastCheck)}
                </Descriptions.Item>
                <Descriptions.Item label="缓存统计">
                  {cacheStats ? (
                    <CacheHitRing rate={cacheStats.hit_rate} />
                  ) : (
                    <span style={{ color: "#bbb" }}>暂无缓存数据</span>
                  )}
                </Descriptions.Item>
                {cacheStats ? (
                  <>
                    <Descriptions.Item label="命中">
                      <span style={{ color: "#52c41a", fontWeight: 700 }}>
                        {cacheStats.hits}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="未命中">
                      <span style={{ color: "#ff4d4f", fontWeight: 700 }}>
                        {cacheStats.misses}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="累计请求">
                      <span style={{ color: "#1890ff", fontWeight: 700 }}>
                        {cacheStats.hits + cacheStats.misses}
                      </span>
                    </Descriptions.Item>
                  </>
                ) : null}
              </Descriptions>
            </Spin>
          </Card>
        </Col>

        {/* ====== 3. Doc-Kit 服务概览（基准卡，沿用结构） ====== */}
        <Col xs={24} md={8} style={{ marginBottom: 16 }}>
          <Card
            title="Doc-Kit 服务概览"
            hoverable
            style={cardStyle}
            extra={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => void refreshDockit()}
                loading={dkChecking}
              >
                刷新
              </Button>
            }
          >
            <Spin spinning={dkChecking}>
              <ServiceStatusTag checking={dkChecking} down={dkDown} />
              <Descriptions {...descriptionsConfig}>
                <Descriptions.Item label="服务名">
                  {dkHealth?.service ?? "doc-kit"}
                </Descriptions.Item>
                <Descriptions.Item label="服务职责">
                  文档解析 + 向量化入库
                </Descriptions.Item>
                <Descriptions.Item label="版本">
                  {dkHealth?.version ?? "--"}
                </Descriptions.Item>
                <Descriptions.Item label="原文集合">
                  {dkHealth?.collections?.docs ?? "--"}
                </Descriptions.Item>
                <Descriptions.Item label="摘要集合">
                  {dkHealth?.collections?.summaries ?? "--"}
                </Descriptions.Item>
                <Descriptions.Item label="已入库原文段">
                  {typeof dkHealth?.stats?.docs_count === "number"
                    ? dkHealth.stats.docs_count
                    : "--"}
                </Descriptions.Item>
                <Descriptions.Item label="已入库摘要段">
                  {typeof dkHealth?.stats?.summaries_count === "number"
                    ? dkHealth.stats.summaries_count
                    : "--"}
                </Descriptions.Item>
              </Descriptions>
            </Spin>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={12} style={{ marginBottom: 16 }}>
          <MilvusMonitorPanel
            data={milvusData}
            loading={milvusLoading}
            onRefresh={() => void refreshMilvus()}
          />
        </Col>
        <Col xs={24} lg={12}>
          <RagUsagePanel
            data={usageData}
            loading={usageLoading}
            onRefresh={() => void refreshUsage()}
          />
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
