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
  getSemanticCacheStats,
} from "../services/chartermate";

function SystemSettings() {
  const [form] = Form.useForm();
  const [healthLoading, setHealthLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [semanticCacheLoading, setSemanticCacheLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [cacheData, setCacheData] = useState<any>(null);
  const [gatewayData, setGatewayData] = useState<any>(null);
  const [semanticCacheData, setSemanticCacheData] = useState<any>(null);

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

  // 加载语义缓存统计信息
  const loadSemanticCacheStats = async () => {
    setSemanticCacheLoading(true);
    try {
      const result = await getSemanticCacheStats();
      if (result.success) {
        setSemanticCacheData(result.data);
      } else {
        message.error(result.message || result.msg || "获取语义缓存统计失败");
      }
    } catch (error) {
      message.error("获取语义缓存统计失败");
    } finally {
      setSemanticCacheLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadHealthStatus();
    loadCacheStats();
    loadGatewayStats();
    loadSemanticCacheStats();
  }, []);

  // 刷新所有数据
  const handleRefresh = () => {
    loadHealthStatus();
    loadCacheStats();
    loadGatewayStats();
    loadSemanticCacheStats();
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
                  loading={
                    healthLoading ||
                    cacheLoading ||
                    gatewayLoading ||
                    semanticCacheLoading
                  }
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
                      <span style={{ color: "#888", fontSize: 12 }}>缓存:</span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: "#1890ff",
                        }}
                      >
                        {cacheData.size}
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
      </Row>

      {/* 语义缓存 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Spin spinning={semanticCacheLoading}>
            <Card type="inner" title="语义缓存">
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
    </>
  );
}

export default SystemSettings;
