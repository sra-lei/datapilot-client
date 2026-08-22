/**
 * 关于页面
 */

import { Card, Col, Row } from 'antd';

function About() {
  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="欢迎使用 知行 InsightForge 管理系统">
            <p>这是一个基于 Ant Design Pro 的管理后台系统。</p>
            <p>当前已实现功能：</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>用户登录/注册</li>
              <li>密码修改</li>
              <li>系统状态监控（Core Service 和 CharterMate）</li>
            </ul>
            <div>服务地址</div>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>Core Service: http://localhost:3002</li>
              <li>CharterMate: http://localhost:8000</li>
              <li>API 文档: http://localhost:3002/core/api-docs</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default About;
