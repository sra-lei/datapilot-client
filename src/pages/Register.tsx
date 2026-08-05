/**
 * 注册页面
 */

import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message } from "antd";
import { useState } from "react";
import { register } from "../services/core";

function Register() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: {
    username: string;
    password: string;
    email?: string;
  }) => {
    setLoading(true);
    try {
      const result = await register(values);
      if (result.success) {
        message.success(result.message || result.msg);
        window.location.href = "/";
      } else {
        message.error(result.message || result.msg);
      }
    } catch (error) {
      message.error("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
        title={
          <div
            style={{
              textAlign: "center",
              fontSize: "20px",
              fontWeight: "bold",
            }}
          >
            知行 InsightForge 管理系统 - 注册
          </div>
        }
      >
        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "用户名至少3个字符" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少6个字符" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱（选填）"
            rules={[{ type: "email", message: "请输入有效邮箱" }]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: "100%", height: 40 }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/" style={{ color: "#1890ff" }}>
            已有账号？立即登录
          </a>
        </div>
      </Card>
    </div>
  );
}

export default Register;
