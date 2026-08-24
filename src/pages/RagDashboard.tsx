/**
 * RAG 评估看板（评估总览）
 * 页面上部常驻「统计总览」（最新平均分 / 通过率 / 响应时间 / 评估次数），
 * 下部按 Tab 加载三项评估结果（antd Tabs 懒挂载，图表在首次激活对应 Tab 时才初始化）：
 *   - 历史趋势折线图（含分类）
 *   - 用例得分柱状图（最新运行）
 *   - 失败用例列表
 * - 评估结果入库：顶部「导入评估结果」上传 test_report_*.json
 */

import {
  CloudUploadOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  message,
  Modal,
  Row,
  Spin,
  Statistic,
  Tabs,
  Tag,
  theme,
  Upload,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";
import type { EvalStatsData } from "../services/core";
import {
  getEvalStats,
  importEvalReport,
  importEvalReportsBatch,
} from "../services/core";
import { usePermission } from "../contexts/PermissionContext";

const CATEGORIES = ["事实查询", "概念查询", "理解推理", "综合概括"];

/**
 * 格式化时间戳显示
 * "20260804_162439" → "08-04 16:24"
 * "2026-08-04 03:09:10" → "08-04 03:09"
 */
function formatTimestamp(ts: string): string {
  if (!ts) return "";
  const m1 = ts.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
  if (m1) return `${m1[2]}-${m1[3]} ${m1[4]}:${m1[5]}`;
  const m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (m2) return `${m2[2]}-${m2[3]} ${m2[4]}:${m2[5]}`;
  return ts;
}

/**
 * 获取分数颜色
 */
function getScoreColor(
  score: number,
  token: ReturnType<typeof theme.useToken>["token"],
): string {
  if (score >= 0.8) return token.colorSuccess;
  if (score >= 0.5) return token.colorWarning;
  return token.colorError;
}

/** 导入前解析的文件 */
interface ParsedReport {
  file: string;
  data?: unknown;
  error?: string;
}

function RagDashboard() {
  const [data, setData] = useState<EvalStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { can } = usePermission();
  const canWrite = can("write", "Eval");

  // 导入评估结果
  const [importOpen, setImportOpen] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [parsedReports, setParsedReports] = useState<ParsedReport[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const { token } = theme.useToken();

  // 分类颜色配置（基于主题 token，随暗黑模式自适应）
  const categoryColors = useMemo<Record<string, string>>(
    () => ({
      事实查询: token.colorPrimary,
      概念查询: token.colorSuccess,
      理解推理: token.purple,
      综合概括: token.colorWarning,
    }),
    [token],
  );

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

  const handleRefresh = () => {
    fetchData();
    message.success("正在刷新数据...");
  };

  useEffect(() => {
    fetchData();
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
        itemStyle: { color: token.colorError },
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
        itemStyle: { color: categoryColors[cat] },
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
        top: 0, // 标题放上面
        textStyle: { fontSize: 16 },
      },
      tooltip: {
        trigger: "axis",
        confine: true, // 不超出图表容器，自动避让边界
        position: (point: number[]) => [point[0], point[1] + 12], // tooltip 下移，避免与上方文字重合
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
        bottom: 0, // toolset（图例）放下面
      },
      // bottom 留足空间：旋转 30° 的时间标签与底部图例互不重叠
      grid: { left: "5%", right: "5%", bottom: "26%", top: "16%" },
      xAxis: { type: "category", data: xData, axisLabel: { rotate: 30 } },
      yAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%" },
      },
      series,
    };
  }, [history, token, categoryColors]);

  // ===== 用例柱状图配置 =====
  const caseOption = useMemo(() => {
    if (!latest?.results) return null;

    const results = latest.results;
    const xData = results.map((r) => r.id);
    const scores = results.map((r) => +(r.score * 100).toFixed(1));
    const colors = results.map((r) => getScoreColor(r.score, token));

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
      // top 加大：标题与图表主体拉开间距
      grid: { left: "5%", right: "5%", bottom: "10%", top: "22%" },
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
  }, [latest, token]);

  // ===== 失败用例列表 =====
  const failedCases = latest?.summary?.failed_cases ?? [];

  // ===== 下部 Tab：历史趋势折线图 / 用例得分柱状图 / 失败用例 =====
  const tabItems = [
    {
      key: "trend",
      label: "历史趋势折线图",
      children: (
        <Card>
          <ReactECharts option={trendOption} style={{ height: 420 }} />
        </Card>
      ),
    },
    {
      key: "cases",
      label: "用例得分柱状图",
      children: (
        <Card>
          {caseOption ? (
            <ReactECharts option={caseOption} style={{ height: 420 }} />
          ) : (
            <Empty description="暂无用例数据" />
          )}
        </Card>
      ),
    },
    {
      key: "failed",
      label: "失败用例",
      children: (
        <Card
          title={
            failedCases.length > 0
              ? `失败用例 (得分 < 50%)，共 ${failedCases.length} 条`
              : "失败用例"
          }
        >
          {failedCases.length > 0 ? (
            <List
              dataSource={failedCases}
              renderItem={(c) => (
                <List.Item
                  style={{ padding: "8px 0" }}
                  actions={[
                    <Tag
                      key="score"
                      color={
                        getScoreColor(c.score, token) === token.colorSuccess
                          ? "green"
                          : "red"
                      }
                    >
                      {(c.score * 100).toFixed(0)}%
                    </Tag>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Tag color="red">{c.id}</Tag>}
                    title={<span style={{ fontSize: 13 }}>{c.question}</span>}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="本次运行暂无失败用例" />
          )}
        </Card>
      ),
    },
  ];

  // ===== 导入评估结果 =====
  const parseFiles = async (files: UploadFile[]) => {
    setImportFileList(files);
    const parsed: ParsedReport[] = [];
    for (const f of files) {
      const file = f.originFileObj as File | undefined;
      if (!file) continue;
      try {
        const text = await file.text();
        const json = JSON.parse(text) as { results?: unknown };
        if (!Array.isArray(json.results) || json.results.length === 0) {
          parsed.push({ file: file.name, error: "results 为空数组，无法入库" });
        } else {
          parsed.push({ file: file.name, data: json });
        }
      } catch (err) {
        parsed.push({
          file: file.name,
          error: `JSON 解析失败: ${(err as Error).message}`,
        });
      }
    }
    setParsedReports(parsed);
    setImportSummary(null);
  };

  const uploadProps: UploadProps = {
    multiple: true,
    accept: ".json,application/json",
    beforeUpload: () => false, // 禁止自动上传，改为本地解析后统一提交
    fileList: importFileList,
    onChange: ({ fileList }) => parseFiles(fileList),
    onRemove: () => {
      setImportFileList([]);
      setParsedReports([]);
      setImportSummary(null);
    },
  };

  const validReports = parsedReports.filter((p) => p.data);

  const handleImportOk = async () => {
    if (validReports.length === 0) return;
    setImporting(true);
    setImportSummary(null);
    try {
      if (validReports.length === 1) {
        const res = await importEvalReport(validReports[0].data);
        if (res.success && res.data) {
          setImportSummary(`✅ 已入库：运行 #${res.data.run_id}`);
        } else {
          setImportSummary(`❌ 导入失败：${res.msg || "未知错误"}`);
        }
      } else {
        const res = await importEvalReportsBatch(
          validReports.map((p) => p.data),
        );
        if (res.success && res.data) {
          const { total, inserted, failures } = res.data;
          setImportSummary(
            `✅ 批量导入完成：成功 ${inserted}/${total}` +
              (failures.length > 0
                ? `，失败 ${failures.length} 份（${failures
                    .map((f) => `#${f.index + 1} ${f.reason ?? ""}`)
                    .join("；")}）`
                : ""),
          );
        } else {
          setImportSummary(`❌ 批量导入失败：${res.msg || "未知错误"}`);
        }
      }
      await fetchData();
      message.success("评估结果已入库，看板已刷新");
    } catch (error) {
      console.error("导入评估结果失败:", error);
      message.error("导入失败，请稍后重试");
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImport = () => {
    setImportOpen(false);
    setImportFileList([]);
    setParsedReports([]);
    setImportSummary(null);
  };

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
        <Empty description="暂无评估数据。请先运行 test_chat.py 生成报告，再通过右上角「导入评估结果」入库" />
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
        <div style={{ display: "flex", gap: 8 }}>
          {canWrite && (
            <Button
              icon={<CloudUploadOutlined />}
              onClick={() => setImportOpen(true)}
            >
              导入评估结果
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
        </div>
      </div>

      {/* 页面上部：统计总览（常驻，不随 Tab 切换） */}
      <Row gutter={[16, 16]} style={{ marginBottom: 10 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="最新平均分"
              value={latest ? (latest.avg_score * 100).toFixed(1) : "--"}
              suffix="%"
              valueStyle={{
                color: latest
                  ? getScoreColor(latest.avg_score, token)
                  : undefined,
              }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
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
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={latest ? latest.avg_elapsed.toFixed(2) : "--"}
              suffix="s"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="历史评估次数" value={history.length} suffix="次" />
          </Card>
        </Col>
      </Row>

      {/* 下部 Tab：历史趋势折线图 / 用例得分柱状图 / 失败用例（懒挂载，首次激活才初始化） */}
      <Tabs defaultActiveKey="trend" items={tabItems} />

      {/* 导入评估结果弹窗 */}
      <Modal
        title="导入评估结果"
        open={importOpen}
        onCancel={handleCloseImport}
        onOk={handleImportOk}
        okText="确认入库"
        cancelText="取消"
        confirmLoading={importing}
        okButtonProps={{ disabled: validReports.length === 0 }}
        width={640}
      >
        <p style={{ color: token.colorTextSecondary, marginBottom: 8 }}>
          上传 test_chat.py 生成的 test_report_*.json（可多选，支持批量入库）
        </p>
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 JSON 报告到此处</p>
          <p className="ant-upload-hint">单份或多份 test_report_*.json</p>
        </Upload.Dragger>

        {parsedReports.length > 0 && (
          <List
            size="small"
            style={{ marginTop: 12 }}
            dataSource={parsedReports}
            renderItem={(p) => (
              <List.Item>
                <span style={{ flex: 1 }}>{p.file}</span>
                {p.error ? (
                  <Tag color="error">{p.error}</Tag>
                ) : (
                  <Tag color="success">解析成功</Tag>
                )}
              </List.Item>
            )}
          />
        )}

        {importSummary && (
          <Alert
            style={{ marginTop: 12 }}
            type={importSummary.startsWith("✅") ? "success" : "error"}
            message={importSummary}
            showIcon
          />
        )}
      </Modal>
    </div>
  );
}

export default RagDashboard;
