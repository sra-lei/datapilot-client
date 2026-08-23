/**
 * RAG 评估看板
 * 顶部：刷新 + CharterMate 评估趋势 / 分类得分 / 缓存统计 / 网关统计
 * （文档上传入口已迁移到独立页面 /doc-ingest，避免本页面信息过载）
 */

import { ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
  message,
  Row,
  Spin,
  Statistic,
  Tag,
} from "antd";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";
import type { CategoryStat, EvalStatsData } from "../services/core";
import { getEvalStats } from "../services/core";
import {
  getCacheStats,
  getGatewayStats,
  getSemanticCacheStats,
} from "../services/docs-seeker";

// 分类颜色配置
const CATEGORY_COLORS: Record<string, string> = {
  事实查询: "#1890ff",
  概念查询: "#52c41a",
  理解推理: "#722ed1",
  综合概括: "#faad14",
};

const CATEGORIES = ["事实查询", "概念查询", "理解推理", "综合概括"];

/**
 * 格式化时间戳显示
 * "20260804_162439" → "08-04 16:24"
 * "2026-08-04 03:09:10" → "08-04 03:09"
 */
function formatTimestamp(ts: string): string {
  if (!ts) return "";
  // 匹配 YYYYMMDD_HHMMSS
  const m1 = ts.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
  if (m1) return `${m1[2]}-${m1[3]} ${m1[4]}:${m1[5]}`;
  // 匹配 YYYY-MM-DD HH:MM:SS
  const m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (m2) return `${m2[2]}-${m2[3]} ${m2[4]}:${m2[5]}`;
  return ts;
}

/**
 * 获取分数颜色
 */
function getScoreColor(score: number): string {
  if (score >= 0.8) return "#52c41a";
  if (score >= 0.5) return "#faad14";
  return "#ff4d4f";
}

function RagDashboard() {
  const [data, setData] = useState<EvalStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [semanticCacheLoading, setSemanticCacheLoading] = useState(false);
  const [cacheData, setCacheData] = useState<any>(null);
  const [gatewayData, setGatewayData] = useState<any>(null);
  const [semanticCacheData, setSemanticCacheData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getEvalStats();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error("获取评估数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 加载缓存统计信息
  const loadCacheStats = async () => {
    setCacheLoading(true);
    try {
      const result = await getCacheStats();
      if (result.success) {
        setCacheData(result.data);
      }
    } catch (error) {
      console.error("获取缓存统计失败:", error);
    } finally {
      setCacheLoading(false);
    }
  };

  // 加载网关统计信息
  const loadGatewayStats = async () => {
    setGatewayLoading(true);
    try {
      const result = await getGatewayStats();
      if (result.success) {
        setGatewayData(result.data);
      }
    } catch (error) {
      console.error("获取网关统计失败:", error);
    } finally {
      setGatewayLoading(false);
    }
  };

  // 加载语义缓存统计信息
  const loadSemanticCacheStats = async () => {
    setSemanticCacheLoading(true);
    try {
      const result = await getSemanticCacheStats();
      if (result.success) {
        setSemanticCacheData(result.data);
      }
    } catch (error) {
      console.error("获取语义缓存统计失败:", error);
    } finally {
      setSemanticCacheLoading(false);
    }
  };

  // 刷新看板数据
  const handleRefresh = () => {
    loadCacheStats();
    loadGatewayStats();
    loadSemanticCacheStats();
    message.success("正在刷新数据...");
  };

  // 计算圆形进度条进度
  const getProgressPercent = (hitRate: string) => {
    return parseFloat(hitRate) || 0;
  };

  useEffect(() => {
    fetchData();
    loadCacheStats();
    loadGatewayStats();
    loadSemanticCacheStats();
  }, []);

  const history = data?.history ?? [];
  const latest = data?.latest;

  // ===== 趋势折线图配置 =====
  const trendOption = useMemo(() => {
    const xData = history.map((h) => formatTimestamp(h.timestamp));
    const series: any[] = [
      {
        name: "平均分",
        type: "line",
        data: history.map((h) => +(h.avg_score * 100).toFixed(1)),
        itemStyle: { color: "#ff4d4f" },
        lineStyle: { width: 3 },
        symbol: "circle",
        symbolSize: 8,
      },
    ];

    // 为每个分类添加一条线
    for (const cat of CATEGORIES) {
      series.push({
        name: cat,
        type: "line",
        data: history.map((h) => {
          const stat = h.category_stats?.[cat];
          return stat ? +(stat.avg_score * 100).toFixed(1) : null;
        }),
        itemStyle: { color: CATEGORY_COLORS[cat] },
        lineStyle: { width: 2, type: "dashed" },
        symbol: "diamond",
        symbolSize: 6,
        connectNulls: true,
      });
    }

    return {
      title: {
        text: "评估得分趋势",
        left: "center",
        textStyle: { fontSize: 16 },
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: any[]) => {
          let html = params[0]?.axisValue + "<br/>";
          for (const p of params) {
            if (p.value !== null && p.value !== undefined) {
              html += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`;
            }
          }
          return html;
        },
      },
      legend: {
        data: ["平均分", ...CATEGORIES],
        bottom: 0,
      },
      grid: { left: "5%", right: "5%", bottom: "12%", top: "15%" },
      xAxis: { type: "category", data: xData, axisLabel: { rotate: 30 } },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%" },
      },
      series,
    };
  }, [history]);

  // ===== 用例柱状图配置 =====
  const caseOption = useMemo(() => {
    if (!latest?.results) return null;

    const results = latest.results;
    const xData = results.map((r) => r.id);
    const scores = results.map((r) => +(r.score * 100).toFixed(1));
    const colors = results.map((r) => getScoreColor(r.score));

    return {
      title: {
        text: "最新评估用例得分",
        left: "center",
        textStyle: { fontSize: 16 },
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const r = results[idx];
          if (!r) return "";
          return (
            `${r.id}: ${r.question}<br/>` +
            `得分: ${(r.score * 100).toFixed(0)}%<br/>` +
            `耗时: ${r.elapsed.toFixed(2)}s<br/>` +
            `关键词命中: ${r.keyword_count} 个<br/>` +
            `章节匹配: ${r.chapter_match ? "是" : "否"}`
          );
        },
      },
      grid: { left: "5%", right: "5%", bottom: "10%", top: "15%" },
      xAxis: { type: "category", data: xData, axisLabel: { rotate: 45 } },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%" },
      },
      series: [
        {
          type: "bar",
          data: scores.map((s, i) => ({
            value: s,
            itemStyle: { color: colors[i] },
          })),
          label: {
            show: true,
            position: "top",
            formatter: "{c}%",
            fontSize: 10,
          },
        },
      ],
    };
  }, [latest]);

  // ===== 分类雷达图配置 =====
  const radarOption = useMemo(() => {
    if (!latest) return null;

    const latestCats = latest.summary.category_stats || {};
    // 找到倒数第二条有分类数据的记录
    let prevCats: Record<string, CategoryStat> | undefined;
    for (let i = history.length - 2; i >= 0; i--) {
      const cats = history[i]?.category_stats;
      if (cats && Object.keys(cats).length > 0) {
        prevCats = cats;
        break;
      }
    }

    const indicator = CATEGORIES.map((cat) => ({
      name: cat,
      max: 100,
    }));

    const series = [
      {
        name: "最新",
        type: "radar",
        data: [
          {
            value: CATEGORIES.map(
              (cat) => +((latestCats[cat]?.avg_score ?? 0) * 100).toFixed(1),
            ),
            name: "最新",
            itemStyle: { color: "#1890ff" },
            areaStyle: { opacity: 0.2 },
          },
        ],
      },
    ];

    if (prevCats) {
      series.push({
        name: "上一次",
        type: "radar",
        data: [
          {
            value: CATEGORIES.map(
              (cat) => +((prevCats[cat]?.avg_score ?? 0) * 100).toFixed(1),
            ),
            name: "上一次",
            itemStyle: { color: "#faad14" },
            areaStyle: { opacity: 0.1 },
          },
        ],
      });
    }

    return {
      title: {
        text: "分类得分对比",
        left: "center",
        textStyle: { fontSize: 16 },
      },
      tooltip: { trigger: "item" },
      legend: {
        data: prevCats ? ["最新", "上一次"] : ["最新"],
        bottom: 0,
      },
      radar: {
        indicator,
        radius: "65%",
      },
      series,
    };
  }, [latest, history]);

  // ===== 失败用例列表 =====
  const failedCases = latest?.summary?.failed_cases ?? [];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data || (!history.length && !latest)) {
    return (
      <div style={{ padding: "48px 0" }}>
        <Empty description="暂无评估数据，请先运行 python -m tests.test_chat" />
      </div>
    );
  }

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
        <h2 style={{ margin: 0 }}>RAG 评估看板</h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* CharterMate 看板 - 顶部一排展示 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Spin spinning={cacheLoading}>
            <Card type="inner" title="缓存统计" style={{ height: 180 }}>
              {cacheData ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* 左侧：圆形进度条显示命中率 */}
                  <div style={{ position: "relative", width: 80, height: 80 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      {/* 背景圆环 */}
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        fill="none"
                        stroke="#f0f0f0"
                        strokeWidth="6"
                      />
                      {/* 进度圆环 */}
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        fill="none"
                        stroke={
                          parseFloat(cacheData.hit_rate) >= 80
                            ? "#52c41a"
                            : parseFloat(cacheData.hit_rate) >= 50
                              ? "#faad14"
                              : "#ff4d4f"
                        }
                        strokeWidth="6"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                        style={{
                          strokeDasharray: `${(getProgressPercent(cacheData.hit_rate) / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`,
                          transition: "stroke-dasharray 0.5s ease",
                        }}
                      />
                    </svg>
                    {/* 中心文字 */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {cacheData.hit_rate}
                      </div>
                      <div style={{ fontSize: 9, color: "#888" }}>命中率</div>
                    </div>
                  </div>

                  {/* 右侧：统计数据 */}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: "#888", fontSize: 12 }}>命中:</span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#52c41a",
                        }}
                      >
                        {cacheData.hits}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: "#888", fontSize: 12 }}>
                        未命中:
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#ff4d4f",
                        }}
                      >
                        {cacheData.misses}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: "#888", fontSize: 12 }}>
                        累计请求:
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {cacheData.hits + cacheData.misses}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>暂无数据</div>
              )}
            </Card>
          </Spin>
        </Col>

        <Col span={8}>
          <Spin spinning={gatewayLoading}>
            <Card type="inner" title="网关状态" style={{ height: 180 }}>
              {gatewayData ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {/* 第一行：熔断器状态 */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ color: "#888", fontSize: 12 }}>熔断器:</span>
                    <Tag
                      color={
                        gatewayData.circuit_state === "closed"
                          ? "success"
                          : gatewayData.circuit_state === "open"
                            ? "error"
                            : "warning"
                      }
                    >
                      {gatewayData.circuit_state === "closed"
                        ? "正常"
                        : gatewayData.circuit_state === "open"
                          ? "熔断"
                          : "半开"}
                    </Tag>
                  </div>

                  {/* 第二行：其他统计数据横向排列 */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span style={{ color: "#888", fontSize: 11 }}>调用:</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {gatewayData.total_calls}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span style={{ color: "#888", fontSize: 11 }}>成功:</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: "bold",
                          color: "#52c41a",
                        }}
                      >
                        {gatewayData.success_calls}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span style={{ color: "#888", fontSize: 11 }}>备用:</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: "bold",
                          color: "#faad14",
                        }}
                      >
                        {gatewayData.fallback_calls}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span style={{ color: "#888", fontSize: 11 }}>失败:</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: "bold",
                          color: "#ff4d4f",
                        }}
                      >
                        {gatewayData.circuit_failures}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>暂无数据</div>
              )}
            </Card>
          </Spin>
        </Col>

        <Col span={8}>
          <Spin spinning={semanticCacheLoading}>
            <Card type="inner" title="语义缓存" style={{ height: 180 }}>
              {semanticCacheData ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* 左侧：圆形进度条显示命中率 */}
                  <div style={{ position: "relative", width: 80, height: 80 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      {/* 背景圆环 */}
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        fill="none"
                        stroke="#f0f0f0"
                        strokeWidth="6"
                      />
                      {/* 进度圆环 */}
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        fill="none"
                        stroke={
                          parseFloat(semanticCacheData.hit_rate) >= 80
                            ? "#52c41a"
                            : parseFloat(semanticCacheData.hit_rate) >= 50
                              ? "#faad14"
                              : "#ff4d4f"
                        }
                        strokeWidth="6"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                        style={{
                          strokeDasharray: `${(getProgressPercent(semanticCacheData.hit_rate) / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`,
                          transition: "stroke-dasharray 0.5s ease",
                        }}
                      />
                    </svg>
                    {/* 中心文字 */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {semanticCacheData.hit_rate}
                      </div>
                      <div style={{ fontSize: 9, color: "#888" }}>命中率</div>
                    </div>
                  </div>

                  {/* 右侧：统计数据 */}
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: "#888", fontSize: 12 }}>命中:</span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#52c41a",
                        }}
                      >
                        {semanticCacheData.hits}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: "#888", fontSize: 12 }}>
                        未命中:
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#ff4d4f",
                        }}
                      >
                        {semanticCacheData.misses}
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ color: "#888", fontSize: 12 }}>
                        相似度阈值:
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {semanticCacheData.threshold}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>暂无数据</div>
              )}
            </Card>
          </Spin>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="最新平均分"
              value={latest ? (latest.avg_score * 100).toFixed(1) : "--"}
              suffix="%"
              valueStyle={{
                color: latest ? getScoreColor(latest.avg_score) : undefined,
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="通过率 (≥80%)"
              value={latest ? `${latest.passed}/${latest.total}` : "--"}
              suffix={
                latest
                  ? `(${((latest.passed / latest.total) * 100).toFixed(0)}%)`
                  : ""
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={latest ? latest.avg_elapsed.toFixed(2) : "--"}
              suffix="s"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="历史评估次数"
              value={history.length}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势折线图 */}
      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={trendOption} style={{ height: 400 }} />
      </Card>

      {/* 柱状图 + 雷达图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card>
            {caseOption ? (
              <ReactECharts option={caseOption} style={{ height: 400 }} />
            ) : (
              <Empty description="暂无用例数据" />
            )}
          </Card>
        </Col>
        <Col span={10}>
          <Card>
            {radarOption ? (
              <ReactECharts option={radarOption} style={{ height: 400 }} />
            ) : (
              <Empty description="暂无分类数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 失败用例 */}
      {failedCases.length > 0 && (
        <Card title="失败用例 (得分 < 50%)">
          {failedCases.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Tag color="red">{c.id}</Tag>
              <span style={{ flex: 1, color: "#666", fontSize: 13 }}>
                {c.question}
              </span>
              <Tag
                color={getScoreColor(c.score) === "#52c41a" ? "green" : "red"}
              >
                {(c.score * 100).toFixed(0)}%
              </Tag>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default RagDashboard;
