/**
 * 仪表盘页面 - 三端服务概览样式对齐
 * 对齐基准：Doc-Kit 卡片骨架（title + 右上角刷新按钮 + Spin + 状态 Tag + Descriptions 列表）
 * Core / Docs-Seeker / Doc-Kit 三张卡共享完全一致的：
 *   - Card props：title / extra / hoverable / style (minHeight)
 *   - 内容节奏：Status Tag (marginBottom:12) → Descriptions (labelStyle 110px宽 + #888色)
 *   - 响应式栅格：xs=24 md=8
 */

import {
  DatabaseOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { checkDocsSeekerHealth, getCacheStats } from "../services/docs-seeker";
import type { CacheStats } from "../services/docs-seeker";
import type { DatabaseStats, QueryResult, TableInfo } from "../services/core";
import {
  checkCoreHealth,
  executeQuery,
  getDatabaseStats,
  getTableData,
  getTables,
} from "../services/core";
import type { DocKitHealthData } from "../services/doc-kit";
import { getDocKitHealth } from "../services/doc-kit";

const { TextArea } = Input;
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

// ======================================================================
//  数据库管理面板（原独立的 /database 页面；现在内联进仪表盘正文）
//  保留全部原逻辑：配置统计、表列表卡片、表数据预览、SQL 查询 Modal
// ======================================================================
function DatabaseViewerPanel() {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 加载表列表
  const loadTables = async () => {
    setLoading(true);
    try {
      const result = await getTables();
      if (result.success) {
        setTables(result.data || []);
      } else {
        message.error(result.message || result.msg);
      }
    } catch (error) {
      message.error("加载表列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const result = await getDatabaseStats();
      if (result.success) {
        setStats(result.data || null);
      }
    } catch (error) {
      console.error("加载统计信息失败", error);
    }
  };

  // 加载表数据
  const loadTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const result = await getTableData(tableName);
      if (result.success) {
        setTableData(result.data || null);
        setSelectedTable(tableName);
      } else {
        message.error(result.message || result.msg);
      }
    } catch (error) {
      message.error("加载表数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 执行 SQL 查询
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      message.warning("请输入 SQL 查询语句");
      return;
    }
    setLoading(true);
    try {
      const result = await executeQuery(sqlQuery);
      if (result.success) {
        setQueryResult(result.data || null);
        message.success("查询成功");
      } else {
        message.error(result.message || result.msg);
      }
    } catch (error) {
      message.error("查询执行失败");
    } finally {
      setLoading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  useEffect(() => {
    void loadTables();
    void loadStats();
  }, []);

  const tableColumns =
    tableData?.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 150,
    })) || [];

  const queryColumns =
    queryResult?.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 150,
    })) || [];

  return (
    <div style={{ width: "100%" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 数据库配置和统计信息 */}
        {stats && (
          <Card
            title={
              <>
                <InfoCircleOutlined /> 数据库配置与统计
              </>
            }
          >
            <Descriptions column={4}>
              <Descriptions.Item label="数据库类型">
                <Tag color="purple">SQLite</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据库路径">
                <Text code copyable>
                  {stats.dbFilePath}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="表数量">
                <Tag color="blue">{stats.tableCount}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="总行数">
                <Tag color="green">{stats.totalRows}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                <Tag color="orange">{formatFileSize(stats.dbFileSize)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="运行环境">
                <Tag>开发环境</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <Text strong>各表行数：</Text>
            <div style={{ marginTop: 8 }}>
              {Object.entries(stats.tableStats).map(([table, count]) => (
                <Tag
                  key={table}
                  style={{ marginLeft: 8, cursor: "pointer" }}
                  color="geekblue"
                  onClick={() => void loadTableData(table)}
                >
                  {table}: {count}
                </Tag>
              ))}
            </div>
          </Card>
        )}

        {/* 表列表 */}
        <Card
          title={
            <>
              <TableOutlined /> 数据表
            </>
          }
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  void loadTables();
                  void loadStats();
                }}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => setModalVisible(true)}
              >
                执行 SQL
              </Button>
            </Space>
          }
        >
          <Spin spinning={loading}>
            <Space wrap size="middle">
              {tables.map((table) => (
                <Card
                  key={table.name}
                  size="small"
                  hoverable
                  style={{
                    width: 200,
                    background:
                      selectedTable === table.name ? "#e6f7ff" : undefined,
                    borderColor:
                      selectedTable === table.name ? "#1890ff" : undefined,
                  }}
                  onClick={() => void loadTableData(table.name)}
                >
                  <DatabaseOutlined style={{ fontSize: 24, marginRight: 8 }} />
                  <Text strong>{table.name}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    类型: {table.type}
                  </Text>
                </Card>
              ))}
            </Space>
          </Spin>
        </Card>

        {/* 表数据 */}
        {selectedTable && tableData && (
          <Card
            title={
              <>
                <TableOutlined /> {selectedTable} - 数据预览 (
                {tableData.rowCount} 行)
              </>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void loadTableData(selectedTable)}
              >
                刷新
              </Button>
            }
          >
            {tableData.rows.length > 0 ? (
              <Table
                columns={tableColumns}
                dataSource={tableData.rows.map((row, index) => ({
                  ...row,
                  key: index,
                }))}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                scroll={{ x: "max-content" }}
                size="small"
              />
            ) : (
              <Alert message="表中没有数据" type="info" showIcon />
            )}
          </Card>
        )}
      </Space>

      {/* SQL 查询 Modal */}
      <Modal
        title={
          <>
            <PlayCircleOutlined /> SQL 查询
          </>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSqlQuery("");
          setQueryResult(null);
        }}
        footer={null}
        width={1000}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <TextArea
            placeholder="输入 SELECT 查询语句..."
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            rows={4}
            style={{ fontFamily: "monospace" }}
          />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => void handleExecuteQuery()}
          >
            执行查询
          </Button>

          {queryResult && (
            <Card title={`查询结果 (${queryResult.rowCount} 行)`} size="small">
              <Table
                columns={queryColumns}
                dataSource={queryResult.rows.map((row, index) => ({
                  ...row,
                  key: index,
                }))}
                pagination={{ pageSize: 10 }}
                scroll={{ x: "max-content" }}
                size="small"
              />
            </Card>
          )}
        </Space>
      </Modal>
    </div>
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

  useEffect(() => {
    void refreshCore();
    void refreshChartermate();
    void refreshDockit();
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

      {/* 原 /database 独立页内容（现在合并到仪表盘正文） */}
      <Divider orientation="left" plain>
        <Tag icon={<DatabaseOutlined />} color="purple">
          数据库管理
        </Tag>
      </Divider>
      <DatabaseViewerPanel />
    </div>
  );
}

export default Dashboard;
