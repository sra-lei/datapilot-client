/**
 * 关于页面
 */

import { config, ServerType } from "@/config";
import { Card, Col, List, Row, Space, Typography } from "antd";

const { Paragraph, Text } = Typography;

const coreUrl = config.servers[ServerType.CORE].url;

const featureModules = [
  { title: "仪表盘", desc: "系统核心状态一览，实时监控各服务健康状态" },
  { title: "RAG 看板", desc: "RAG 检索问答链路的运行数据看板" },
  {
    title: "文档入库",
    desc: "文档上传、解析、分块与向量化入库（基于 Doc-Kit）",
  },
  { title: "评估集管理", desc: "评估集的创建与管理，支持文档范围与状态跟踪" },
  { title: "用户管理", desc: "用户账号的创建、启停与信息维护" },
  { title: "权限管理", desc: "基于角色的访问控制（RBAC），细粒度操作授权" },
];

const backendServices = [
  {
    name: "Core Service",
    url: config.servers[ServerType.CORE].url,
    desc: "主后端服务（Node.js），提供核心 API 与 OpenAPI 文档",
  },
  {
    name: "Doc-Kit",
    url: config.servers[ServerType.DOC_KIT].url,
    desc: "文档解析 / 分块 / 向量入库服务",
  },
  {
    name: "Docs-Seeker",
    url: config.servers[ServerType.DOCS_SEEKER].url,
    desc: "RAG 检索问答服务（Python FastAPI）",
  },
];

function About() {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="关于系统">
            <Paragraph>
              知行 InsightForge
              是面向企业文档知识库的智能管理平台，覆盖文档入库、RAG 检索问答、
              评估集管理、用户与权限管理等全流程，帮助团队高效沉淀与利用知识资产。
            </Paragraph>
            <Space direction="vertical" size="small">
              <Text type="secondary">系统版本：{config.version}</Text>
              <Text type="secondary">
                技术栈：React 18 + TypeScript + Ant Design 5 + Vite，基于 CASL
                实现细粒度权限控制
              </Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="功能模块">
            <List
              size="small"
              dataSource={featureModules}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.title} description={item.desc} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="后端服务">
            <List
              size="small"
              dataSource={backendServices}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={
                      <>
                        {item.desc}
                        <br />
                        <Text type="secondary">
                          地址：<Text code>{item.url}</Text>
                        </Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
            <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
              <Text type="secondary">
                API 文档：
                <Text code>
                  {coreUrl}
                  {config.apiPrefix}/api-docs
                </Text>
              </Text>
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default About;
