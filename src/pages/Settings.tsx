/**
 * 系统设置页面
 */

import { Card, Form, Select, Switch } from "antd";

function SystemSettings() {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        logLevel: "info",
        enableCache: true,
      }}
    >
      <Card type="inner" title="CharterMate设置" style={{ marginBottom: 16 }}>
        <Form.Item name="logLevel" label="日志级别">
          <Select>
            <Select.Option value="debug">Debug</Select.Option>
            <Select.Option value="info">Info</Select.Option>
            <Select.Option value="warn">Warn</Select.Option>
            <Select.Option value="error">Error</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="enableCache" label="启用缓存" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>
    </Form>
  );
}

export default SystemSettings;
