/**
 * 仪表盘页面 - 三端服务概览样式对齐
 * 对齐基准：Doc-Kit 卡片骨架（title + 右上角刷新按钮 + Spin + 状态 Tag + Descriptions 列表）
 * Core / Docs-Seeker / Doc-Kit 三张卡共享完全一致的：
 *   - Card props：title / extra / hoverable / style (minHeight)
 *   - 内容节奏：Status Tag (marginBottom:12) → Descriptions (labelStyle 110px宽 + colorTextSecondary色)
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
  Tag,
  Typography,
  theme,
} from "antd";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";import { checkCoreHealth } from "../services/core";
import type { DocKitHealthData } from "../services/doc-kit";
import { getDocKitHealth } from "../services/doc-kit";
import {
  checkDocsSeekerHealth,
  getCacheStats,
  getGatewayStats,
  getMilvusStats,
  getRagUsageStats,
  getSemanticCacheStats,
} from "../services/docs-seeker";
import type {
  CacheStats,
  LLMStats,
  MilvusCollectionStats,
  MilvusStats,
  UsageStats,
} from "../services/docs-seeker";

const { Text } = Typography;

// ---------------------------------------------------------------
//  三卡共享的设计 tokens（单一基准，避免 inline 零散重复）
// ---------------------------------------------------------------
// 顶部三张服务概览卡：高度缩小 1/5（400 → 320），内容更紧凑
const cardStyle = { minHeight: 320, height: "100%" } as const;
const descriptionsConfig = {
  size: "small" as const,
  column: 1,
  labelStyle: { width: 110 },
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
//  RAG 使用统计面板
//  顶部：总调用 / 成功率 / 活跃用户；
//  下方一排三列：缓存统计 | 网关状态 | 语义缓存（紧凑内嵌卡，左右对齐指标行）
// ===============================================================
/** 紧凑指标行：label 居左、value 居右对齐 */
function MetricRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: ReactNode;
  valueColor?: string;
}) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "3px 0",
      }}
    >
      <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: valueColor ?? token.colorText,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** 上下结构指标块：次数在上、文字在下，居中 */
function MetricBlock({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: ReactNode;
  valueColor?: string;
}) {
  const { token } = theme.useToken();
  return (
    <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: valueColor ?? token.colorText,
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
        {label}
      </div>
    </div>
  );
}

function RagUsagePanel({
  usage,
  cache,
  gateway,
  semantic,
  loading,
  onRefresh,
}: {
  usage: UsageStats | null;
  cache: CacheStats | null;
  gateway: LLMStats | null;
  semantic: CacheStats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const { token } = theme.useToken();
  const successRate = parseFloat(usage?.success_rate || "0") || 0;

  return (
    <Card
      title={
        <>
          <DatabaseOutlined /> RAG 使用统计
        </>
      }
      hoverable
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
        {/* 使用统计 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Statistic title="总调用次数" value={usage?.total_calls ?? 0} />
          </Col>
          <Col span={8}>
            <Statistic
              title="成功率"
              value={usage?.success_rate ?? "0.0%"}
              valueStyle={{
                color: successRate >= 90 ? token.colorSuccess : token.colorWarning,
              }}
            />
          </Col>
          <Col span={8}>
            <Statistic title="活跃用户" value={usage?.active_users ?? 0} />
          </Col>
        </Row>

        {/* 缓存统计 / 网关状态 / 语义缓存 —— 一排三列 */}
        <Row gutter={16}>
          {/* 缓存统计 */}
          <Col xs={24} md={8}>
            <Card type="inner" size="small" title="缓存统计" style={{ height: "100%" }}>
              {cache ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CacheHitRing rate={cache.hit_rate} />
                  <div style={{ flex: 1 }}>
                    <MetricRow
                      label="命中"
                      value={cache.hits}
                      valueColor={token.colorSuccess}
                    />
                    <MetricRow
                      label="未命中"
                      value={cache.misses}
                      valueColor={token.colorError}
                    />
                    <MetricRow
                      label="累计请求"
                      value={cache.hits + cache.misses}
                      valueColor={token.colorPrimary}
                    />
                  </div>
                </div>
              ) : (
                <span style={{ color: token.colorTextQuaternary }}>暂无缓存数据</span>
              )}
            </Card>
          </Col>

          {/* 网关状态 */}
          <Col xs={24} md={8}>
            <Card type="inner" size="small" title="网关状态" style={{ height: "100%" }}>
              {gateway ? (
                <>
                  <div style={{ marginBottom: 6 }}>
                    <Tag
                      color={
                        gateway.circuit_state === "closed"
                          ? "success"
                          : gateway.circuit_state === "open"
                            ? "error"
                            : "warning"
                      }
                    >
                      {gateway.circuit_state === "closed"
                        ? "熔断器：正常"
                        : gateway.circuit_state === "open"
                          ? "熔断器：熔断"
                          : "熔断器：半开"}
                    </Tag>
                  </div>
                  {/* 调用/成功/备用/失败：次数在上、文字在下（上下结构），禁止换行保持一行 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 4,
                      flexWrap: "nowrap",
                      paddingTop: 4,
                    }}
                  >
                    <MetricBlock label="调用" value={gateway.total_calls} />
                    <MetricBlock
                      label="成功"
                      value={gateway.success_calls}
                      valueColor={token.colorSuccess}
                    />
                    <MetricBlock label="备用" value={gateway.fallback_calls} />
                    <MetricBlock
                      label="失败"
                      value={gateway.circuit_failures}
                      valueColor={token.colorError}
                    />
                  </div>
                </>
              ) : (
                <span style={{ color: token.colorTextQuaternary }}>暂无网关数据</span>
              )}
            </Card>
          </Col>

          {/* 语义缓存（命中率等同缓存统计，仅展示差异字段） */}
          <Col xs={24} md={8}>
            <Card type="inner" size="small" title="语义缓存" style={{ height: "100%" }}>
              {semantic ? (
                <>
                  <div style={{ marginBottom: 6 }}>
                    <Tag color={semantic.enabled === false ? "default" : "success"}>
                      启用：{semantic.enabled === false ? "关闭" : "开启"}
                    </Tag>
                  </div>
                  <MetricRow
                    label="命中率"
                    value={semantic.hit_rate}
                    valueColor={token.colorPrimary}
                  />
                  <MetricRow
                    label="相似度阈值"
                    value={semantic.threshold ?? "--"}
                  />
                </>
              ) : (
                <span style={{ color: token.colorTextQuaternary }}>暂无语义缓存数据</span>
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </Card>
  );
}

// 缓存/语义缓存命中率环形图（纯圆环 + 中心文字）
function CacheHitRing({ rate }: { rate: string }) {
  const { token } = theme.useToken();
  const pct = parseFloat(rate) || 0;
  const color =
    pct >= 80
      ? token.colorSuccess
      : pct >= 50
        ? token.colorWarning
        : token.colorError;
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={token.colorBorderSecondary}
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
            color: token.colorPrimary,
            lineHeight: 1.2,
          }}
        >
          {isNaN(pct) ? "--" : rate}
        </div>
        <div style={{ fontSize: 10, color: token.colorTextSecondary }}>命中率</div>
      </div>
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
  const { token } = theme.useToken();
  if (!stat) {
    return (
      <div style={{ color: token.colorTextQuaternary, marginBottom: 12 }}>
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
          labelStyle={{ width: 70, color: token.colorTextSecondary }}
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
  const { token } = theme.useToken();
  return (
    <Card
      title={
        <>
          <DatabaseOutlined /> Milvus 监控
        </>
      }
      hoverable
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
        <Descriptions
          {...descriptionsConfig}
          labelStyle={{
            ...descriptionsConfig.labelStyle,
            color: token.colorTextSecondary,
          }}
        >
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
  const { token } = theme.useToken();
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

  // ------- RAG 使用统计（含缓存 / 网关 / 语义缓存，合并自原系统状态页） -------
  const [usageData, setUsageData] = useState<UsageStats | null>(null);
  const [gatewayData, setGatewayData] = useState<LLMStats | null>(null);
  const [semanticData, setSemanticData] = useState<CacheStats | null>(null);
  const [ragLoading, setRagLoading] = useState(false);

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

  // RAG 使用统计卡片整体刷新：使用统计 + 缓存 + 网关 + 语义缓存（合并自原系统状态页）
  const refreshRag = async () => {
    setRagLoading(true);
    try {
      const [u, c, g, s] = await Promise.all([
        getRagUsageStats(),
        getCacheStats(),
        getGatewayStats(),
        getSemanticCacheStats(),
      ]);
      if (u.success && u.data) setUsageData(u.data);
      if (c.success && c.data) setCacheStats(c.data);
      if (g.success && g.data) setGatewayData(g.data);
      if (s.success && s.data) setSemanticData(s.data);
    } catch {
      /* ignore */
    } finally {
      setRagLoading(false);
    }
  };

  useEffect(() => {
    void refreshCore();
    void refreshChartermate();
    void refreshDockit();
    void refreshMilvus();
    void refreshRag();
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
              <Descriptions
          {...descriptionsConfig}
          labelStyle={{
            ...descriptionsConfig.labelStyle,
            color: token.colorTextSecondary,
          }}
        >
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
              <Descriptions
          {...descriptionsConfig}
          labelStyle={{
            ...descriptionsConfig.labelStyle,
            color: token.colorTextSecondary,
          }}
        >
                <Descriptions.Item label="服务名">
                  Docs-Seeker
                </Descriptions.Item>
                <Descriptions.Item label="服务职责">
                  RAG 检索 + LLM 问答
                </Descriptions.Item>
                <Descriptions.Item label="最后检查">
                  {fmt(cmLastCheck)}
                </Descriptions.Item>
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
              <Descriptions
          {...descriptionsConfig}
          labelStyle={{
            ...descriptionsConfig.labelStyle,
            color: token.colorTextSecondary,
          }}
        >
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
        <Col xs={24} lg={12}>
          <MilvusMonitorPanel
            data={milvusData}
            loading={milvusLoading}
            onRefresh={() => void refreshMilvus()}
          />
        </Col>
        <Col xs={24} lg={12}>
          <RagUsagePanel
            usage={usageData}
            cache={cacheStats}
            gateway={gatewayData}
            semantic={semanticData}
            loading={ragLoading}
            onRefresh={() => void refreshRag()}
          />
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
