/**
 * 仪表盘页面
 */

import { CloudServerOutlined, ReloadOutlined } from "@ant-design/icons";
import { Badge, Button, Card, Col, Row, Spin, Statistic } from "antd";
import { useEffect, useState } from "react";
import {
  checkHealth as checkChartermateHealth,
  getCacheStats,
} from "../services/chartermate";
import { checkHealth } from "../services/core";

interface ServiceStatus {
  status: "ok" | "error" | "checking";
  lastCheck: Date | null;
}

interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: string;
  size: number;
}

function Dashboard() {
  const [coreStatus, setCoreStatus] = useState<ServiceStatus>({
    status: "checking",
    lastCheck: null,
  });
  const [chartermateStatus, setChartermateStatus] = useState<ServiceStatus>({
    status: "checking",
    lastCheck: null,
  });
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // 检查 Core Service 状态
  const checkCoreHealthStatus = async () => {
    setCoreStatus((prev) => ({ ...prev, status: "checking" }));
    try {
      const data = await checkHealth();
      setCoreStatus({
        status: data.data?.status === "ok" ? "ok" : "error",
        lastCheck: new Date(),
      });
    } catch {
      setCoreStatus({
        status: "error",
        lastCheck: new Date(),
      });
    }
  };

  // 检查 CharterMate Service 状态
  const checkChartermateHealthStatus = async () => {
    setChartermateStatus((prev) => ({ ...prev, status: "checking" }));
    try {
      const result = await checkChartermateHealth();
      if (result.success && result.data) {
        setChartermateStatus({
          status: result.data.status === "ok" ? "ok" : "error",
          lastCheck: new Date(),
        });
      } else {
        setChartermateStatus({
          status: "error",
          lastCheck: new Date(),
        });
      }
    } catch {
      setChartermateStatus({
        status: "error",
        lastCheck: new Date(),
      });
    }

    // 同时获取缓存统计
    try {
      const statsResult = await getCacheStats();
      if (statsResult.success && statsResult.data) {
        setCacheStats(statsResult.data);
      }
    } catch {
      // 缓存统计获取失败不影响状态显示
    }
  };

  useEffect(() => {
    // 初始化检查所有服务状态
    checkCoreHealthStatus();
    checkChartermateHealthStatus();
  }, []);

  // 渲染服务状态
  const renderStatus = (status: ServiceStatus) => {
    if (status.status === "checking") {
      return <Spin size="small" />;
    }
    return (
      <Badge
        status={status.status === "ok" ? "success" : "error"}
        text={status.status === "ok" ? "运行正常" : "服务异常"}
      />
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card hoverable>
            <Statistic
              title="Core Service"
              valueRender={() => renderStatus(coreStatus)}
              prefix={<CloudServerOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              {coreStatus.lastCheck
                ? `最后检查: ${coreStatus.lastCheck.toLocaleTimeString("zh-CN")}`
                : "未检查"}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              状态监控服务
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={checkCoreHealthStatus}
              size="small"
              style={{ marginTop: 8 }}
            >
              刷新状态
            </Button>
          </Card>
        </Col>
        <Col span={12}>
          <Card hoverable>
            <Statistic
              title="CharterMate"
              valueRender={() => renderStatus(chartermateStatus)}
              prefix={<CloudServerOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              {chartermateStatus.lastCheck
                ? `最后检查: ${chartermateStatus.lastCheck.toLocaleTimeString("zh-CN")}`
                : "未检查"}
            </div>
            {cacheStats && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="none"
                      stroke="#f0f0f0"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="none"
                      stroke={
                        parseFloat(cacheStats.hit_rate) >= 80
                          ? "#52c41a"
                          : parseFloat(cacheStats.hit_rate) >= 50
                            ? "#faad14"
                            : "#ff4d4f"
                      }
                      strokeWidth="6"
                      strokeLinecap="round"
                      transform="rotate(-90 40 40)"
                      style={{
                        strokeDasharray: `${(parseFloat(cacheStats.hit_rate) / 100) * 2 * Math.PI * 30} ${2 * Math.PI * 30}`,
                        transition: "stroke-dasharray 0.5s ease",
                      }}
                    />
                  </svg>
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
                      {cacheStats.hit_rate}
                    </div>
                    <div style={{ fontSize: 10, color: "#888" }}>命中率</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#52c41a",
                      }}
                    >
                      {cacheStats.hits}
                    </div>
                    <div style={{ fontSize: 10, color: "#888" }}>命中</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#ff4d4f",
                      }}
                    >
                      {cacheStats.misses}
                    </div>
                    <div style={{ fontSize: 10, color: "#888" }}>未命中</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#1890ff",
                      }}
                    >
                      {cacheStats.size}
                    </div>
                    <div style={{ fontSize: 10, color: "#888" }}>缓存数量</div>
                  </div>
                </div>
              </div>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={checkChartermateHealthStatus}
              size="small"
              style={{ marginTop: 8 }}
            >
              刷新状态
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
