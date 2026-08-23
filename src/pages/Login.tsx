/**
 * 登录页面
 */

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../services/core";

function Login() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  // 获取登录后要重定向的路径，默认为 /dashboard
  const from = (location.state as any)?.from || "/dashboard";

  const handleSubmit = async (values: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const result = await login(values);
      if (result.success && result.data) {
        message.success(result.message || result.msg);
        const userData = {
          ...result.data,
          roles: (result.data as any).roles || ["admin"],
          permissions: (result.data as any).permissions || ["*:*"],
        };
        localStorage.setItem("user", JSON.stringify(result.data));
        localStorage.setItem("currentUser", JSON.stringify(userData));
        navigate(from, { replace: true });
      } else {
        message.error(result.message || result.msg);
      }
    } catch (error) {
      message.error("登录失败，请重试");
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
          <div style={{ textAlign: "center" }}>
            <img
              src="/favicon.svg"
              alt="logo"
              style={{ width: 48, height: 48, marginBottom: 8 }}
            />
            <div style={{ fontSize: "20px", fontWeight: "bold" }}>
              知行 InsightForge 管理系统
            </div>
          </div>
        }
      >
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: "100%", height: 40 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/register" style={{ color: "#1890ff" }}>
            还没有账号？立即注册
          </a>
        </div>
      </Card>
    </div>
  );
}

export default Login;
