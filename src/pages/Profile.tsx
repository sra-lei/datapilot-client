/**
 * 个人资料页面
 */

import { LockOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Space,
  Tag,
} from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ApiResponse } from "../services/core";
import { changePassword } from "../services/core";

interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  created_at?: string;
}

function Profile() {
  const navigate = useNavigate();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 从 localStorage 获取用户信息
  const getUserInfo = (): UserInfo | null => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error("获取用户信息失败", error);
    }
    return null;
  };

  // 从 localStorage 获取用户角色
  const getUserRoles = (): string[] => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.roles || [];
      }
    } catch (error) {
      console.error("获取用户角色失败", error);
    }
    return [];
  };

  const userInfo = getUserInfo();
  const roles = getUserRoles();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    message.success("已退出登录");
    navigate("/login");
  };

  const handleChangePassword = async (values: {
    oldPassword: string;
    newPassword: string;
  }) => {
    setLoading(true);
    try {
      const result: ApiResponse = await changePassword({
        username: userInfo?.username || "",
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      if (result.success) {
        message.success(result.message || result.msg);
        setPasswordModalVisible(false);
        form.resetFields();
      } else {
        message.error(result.message || result.msg);
      }
    } catch (error) {
      message.error("修改失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo) {
    return (
      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <p>未找到用户信息</p>
          <Button type="primary" onClick={() => navigate("/login")}>
            去登录
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <>
      <Card
        title={
          <Space>
            <UserOutlined />
            个人资料
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<LockOutlined />}
              onClick={() => setPasswordModalVisible(true)}
            >
              修改密码
            </Button>
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        }
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="用户ID">{userInfo.id}</Descriptions.Item>
          <Descriptions.Item label="用户名">
            {userInfo.username}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {userInfo.email || <Tag color="default">未设置</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            <Space>
              {roles.map((role) => (
                <Tag key={role} color="blue">
                  {role}
                </Tag>
              ))}
            </Space>
          </Descriptions.Item>
          {userInfo.created_at && (
            <Descriptions.Item label="注册时间">
              {new Date(userInfo.created_at).toLocaleString("zh-CN")}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="oldPassword"
            label="旧密码"
            rules={[{ required: true, message: "请输入旧密码" }]}
          >
            <Input.Password placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, message: "请输入新密码" }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请确认新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default Profile;
