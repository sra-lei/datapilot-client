/**
 * 仪表盘页面
 */

import { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Button, Badge, Spin } from 'antd';
import {
  CloudServerOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { checkHealth } from '../services/core';
import { checkHealth as checkChartermateHealth, getCacheStats } from '../services/chartermate';

interface ServiceStatus {
  status: 'ok' | 'error' | 'checking';
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
    status: 'checking',
    lastCheck: null,
  });
  const [chartermateStatus, setChartermateStatus] = useState<ServiceStatus>({
    status: 'checking',
    lastCheck: null,
  });
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // 检查 Core Service 状态
  const checkCoreHealthStatus = async () => {
    setCoreStatus(prev => ({ ...prev, status: 'checking' }));
    try {
      const data = await checkHealth();
      setCoreStatus({
        status: data.data?.status === 'ok' ? 'ok' : 'error',
        lastCheck: new Date(),
      });
    } catch {
      setCoreStatus({
        status: 'error',
        lastCheck: new Date(),
      });
    }
  };

  // 检查 CharterMate Service 状态
  const checkChartermateHealthStatus = async () => {
    setChartermateStatus(prev => ({ ...prev, status: 'checking' }));
    try {
      const result = await checkChartermateHealth();
      if (result.status === 200 && result.data) {
        setChartermateStatus({
          status: result.data.status === 'ok' ? 'ok' : 'error',
          lastCheck: new Date(),
        });
      } else {
        setChartermateStatus({
          status: 'error',
          lastCheck: new Date(),
        });
      }
    } catch {
      setChartermateStatus({
        status: 'error',
        lastCheck: new Date(),
      });
    }

    // 同时获取缓存统计
    try {
      const statsResult = await getCacheStats();
      if (statsResult.status === 200 && statsResult.data) {
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
    if (status.status === 'checking') {
      return <Spin size="small" />;
    }
    return (
      <Badge
        status={status.status === 'ok' ? 'success' : 'error'}
        text={status.status === 'ok' ? '运行正常' : '服务异常'}
      />
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="欢迎使用 Trae 管理系统">
            <p>这是一个基于 Ant Design Pro 的管理后台系统。</p>
            <p>当前已实现功能：</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>用户登录/注册</li>
              <li>密码修改</li>
              <li>系统状态监控（Core Service 和 CharterMate）</li>
            </ul>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="服务地址">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>Core Service: http://localhost:3002</li>
              <li>CharterMate: http://localhost:8000</li>
              <li>API 文档: http://localhost:3002/core/api-docs</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card hoverable>
            <Statistic
              title="Core Service"
              valueRender={() => renderStatus(coreStatus)}
              prefix={<CloudServerOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {coreStatus.lastCheck
                ? `最后检查: ${coreStatus.lastCheck.toLocaleTimeString('zh-CN')}`
                : '未检查'}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
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
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {chartermateStatus.lastCheck
                ? `最后检查: ${chartermateStatus.lastCheck.toLocaleTimeString('zh-CN')}`
                : '未检查'}
            </div>
            {cacheStats && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                缓存命中率: {cacheStats.hit_rate} ({cacheStats.hits}/{cacheStats.hits + cacheStats.misses})
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
