/**
 * 系统设置页面
 */

import { ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Row,
  Select,
  Spin,
  Switch,
  Tag,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  checkHealth,
  getCacheStats,
  getGatewayStats,
} from "../services/chartermate";

function SystemSettings() {
  const [form] = Form.useForm();
  const [healthLoading, setHealthLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [cacheData, setCacheData] = useState<any>(null);
  const [gatewayData, setGatewayData] = useState<any>(null);

  // 加载服务健康状态
  const loadHealthStatus = async () => {
    setHealthLoading(true);
    try {
      const result = await checkHealth();
      if (result.success) {
        setHealthData(result.data);
      } else {
        message.error(result.message || result.msg || "获取健康状态失败");
      }
    } catch (error) {
      message.error("获取健康状态失败");
    } finally {
      setHealthLoading(false);
    }
  };

  // 加载缓存统计信息
  const loadCacheStats = async () => {
    setCacheLoading(true);
    try {
      const result = await getCacheStats();
      if (result.success) {
        setCacheData(result.data);
      } else {
        message.error(result.message || result.msg || "获取缓存统计失败");
      }
    } catch (error) {
      message.error("获取缓存统计失败");
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
      } else {
        message.error(result.message || result.msg || "获取网关统计失败");
      }
    } catch (error) {
      message.error("获取网关统计失败");
    } finally {
      setGatewayLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadHealthStatus();
    loadCacheStats();
    loadGatewayStats();
  }, []);

  // 刷新所有数据
  const handleRefresh = () => {
    loadHealthStatus();
    loadCacheStats();
    loadGatewayStats();
    message.success("正在刷新数据...");
  };

  // 计算圆形进度条进度
  const getProgressPercent = (hitRate: string) => {
    return parseFloat(hitRate) || 0;
  };

  return (
    <>
      {/* CharterMate 设置 - 放在最上方，单独占一行 */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          logLevel: "info",
          enableCache: true,
        }}
      >
        <Card
          type="inner"
          title="CharterMate 设置"
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="logLevel" label="日志级别">
            <Select>
              <Select.Option value="debug">Debug</Select.Option>
              <Select.Option value="info">Info</Select.Option>
              <Select.Option value="warn">Warn</Select.Option>
              <Select.Option value="error">Error</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="enableCache"
            label="启用缓存"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>
      </Form>

      {/* 服务状态 - 三个Card横向排列 */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Spin spinning={healthLoading}>
            <Card
              type="inner"
              title="健康状态"
              style={{ height: 180 }}
              extra={
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={healthLoading || cacheLoading || gatewayLoading}
                >
                  刷新
                </Button>
              }
            >
              {healthData ? (
                <div>
                  <Tag color={healthData.status === "ok" ? "success" : "error"}>
                    {healthData.status === "ok" ? "正常" : "异常"}
                  </Tag>
                </div>
              ) : (
                <div>暂无数据</div>
              )}
            </Card>
          </Spin>
        </Col>

        <Col span={8}>
          <Spin spinning={cacheLoading}>
            <Card type="inner" title="缓存统计">
              {cacheData ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {/* 圆形进度条显示命中率 */}
                  <div
                    style={{ position: "relative", width: 100, height: 100 }}
                  >
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      {/* 背景圆环 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#f0f0f0"
                        strokeWidth="8"
                      />
                      {/* 进度圆环 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={
                          parseFloat(cacheData.hit_rate) >= 80
                            ? "#52c41a"
                            : parseFloat(cacheData.hit_rate) >= 50
                              ? "#faad14"
                              : "#ff4d4f"
                        }
                        strokeWidth="8"
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{
                          strokeDasharray: `${(getProgressPercent(cacheData.hit_rate) / 100) * 2 * Math.PI * 40} ${2 * Math.PI * 40}`,
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
                          fontSize: 18,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {cacheData.hit_rate}
                      </div>
                      <div style={{ fontSize: 10, color: "#888" }}>命中率</div>
                    </div>
                  </div>

                  {/* 文本信息 */}
                  <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#52c41a",
                        }}
                      >
                        {cacheData.hits}
                      </div>
                      <div style={{ fontSize: 10, color: "#888" }}>命中</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#ff4d4f",
                        }}
                      >
                        {cacheData.misses}
                      </div>
                      <div style={{ fontSize: 10, color: "#888" }}>未命中</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {cacheData.size}
                      </div>
                      <div style={{ fontSize: 10, color: "#888" }}>缓存</div>
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
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ color: "#888", fontSize: 12 }}>总调用:</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#1890ff",
                      }}
                    >
                      {gatewayData.total_calls}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ color: "#888", fontSize: 12 }}>成功:</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#52c41a",
                      }}
                    >
                      {gatewayData.success_calls}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ color: "#888", fontSize: 12 }}>备用:</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#faad14",
                      }}
                    >
                      {gatewayData.fallback_calls}
                    </span>
                  </div>
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
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ color: "#888", fontSize: 12 }}>失败数:</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#ff4d4f",
                      }}
                    >
                      {gatewayData.circuit_failures}
                    </span>
                  </div>
                </div>
              ) : (
                <div>暂无数据</div>
              )}
            </Card>
          </Spin>
        </Col>
      </Row>
    </>
  );
}

export default SystemSettings;
