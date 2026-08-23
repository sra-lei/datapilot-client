/**
 * 权限管理页面
 */

import {
  DeleteOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  theme,
  Transfer,
} from "antd";
import { useEffect, useState } from "react";
import { Can } from "../components/Can";
import type { Permission, Role, RoleWithPermissions } from "../services/core";
import {
  createRole,
  deleteRole,
  getAllPermissions,
  getAllRoles,
  getRoleWithPermissions,
  grantPermission,
  revokePermission,
} from "../services/core";
import { repairLatin1Mojibake } from "../utils/textRepair";

function PermissionManagement() {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(
    null,
  );
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载权限列表
  const loadPermissions = async () => {
    setLoading(true);
    try {
      const response = await getAllPermissions();
      if (response.success) {
        // 渲染层兜底：后端修复若因连接未重置未生效，前端再修一次（Latin-1 mojibake 无损）
        setPermissions(
          (response.data || []).map((p) => ({
            ...p,
            description: repairLatin1Mojibake(p.description),
          })),
        );
      } else {
        message.error(response.message || response.msg);
      }
    } catch (error) {
      message.error("加载权限列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载角色列表
  const loadRoles = async () => {
    setLoading(true);
    try {
      const response = await getAllRoles();
      if (response.success) {
        setRoles(
          (response.data || []).map((r) => ({
            ...r,
            description: repairLatin1Mojibake(r.description),
          })),
        );
      } else {
        message.error(response.message || response.msg);
      }
    } catch (error) {
      message.error("加载角色列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载角色详情
  const loadRoleDetails = async (roleId: number) => {
    setLoading(true);
    try {
      const response = await getRoleWithPermissions(roleId);
      if (response.success && response.data) {
        const raw = response.data;
        setSelectedRole({
          ...raw,
          description: repairLatin1Mojibake(raw.description),
          permissions: (raw.permissions || []).map((p) => ({
            ...p,
            description: repairLatin1Mojibake(p.description),
          })),
        });
      } else {
        message.error(response.message || response.msg);
      }
    } catch (error) {
      message.error("加载角色详情失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
    loadRoles();
  }, []);

  // 默认选中第一个角色，直接展示权限配置窗口（无需手动点击角色名）
  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      loadRoleDetails(roles[0].id);
    }
  }, [roles]);

  // 创建角色
  const handleCreateRole = () => {
    form.validateFields().then(async (values) => {
      try {
        const response = await createRole(values.name, values.description);
        if (response.success) {
          message.success("创建角色成功");
          setCreateModalVisible(false);
          form.resetFields();
          loadRoles();
        } else {
          message.error(response.message || response.msg);
        }
      } catch (error) {
        message.error("创建角色失败");
      }
    });
  };

  // 删除角色
  const handleDeleteRole = async (roleId: number) => {
    try {
      const response = await deleteRole(roleId);
      if (response.success) {
        message.success("删除角色成功");
        if (selectedRole?.id === roleId) {
          setSelectedRole(null);
        }
        loadRoles();
      } else {
        message.error(response.message || response.msg);
      }
    } catch (error) {
      message.error("删除角色失败");
    }
  };

  // 授予权限
  const handleGrantPermission = async (permissionId: number) => {
    if (!selectedRole) return;

    try {
      const response = await grantPermission(selectedRole.id, permissionId);
      if (response.success) {
        message.success("授予权限成功");
        loadRoleDetails(selectedRole.id);
      } else {
        message.error(response.message || response.msg);
      }
    } catch (error) {
      message.error("授予权限失败");
    }
  };

  // 撤销权限
  const handleRevokePermission = async (permissionId: number) => {
    if (!selectedRole) return;

    try {
      const response = await revokePermission(selectedRole.id, permissionId);
      if (response.success) {
        message.success("撤销权限成功");
        loadRoleDetails(selectedRole.id);
      } else {
        message.error(response.message || response.msg);
      }
    } catch (error) {
      message.error("撤销权限失败");
    }
  };

  // Transfer 数据源
  const rolePermissions = selectedRole?.permissions.map((p) => p.id) || [];
  const transferData = permissions.map((p) => ({
    key: p.id,
    title: p.name,
    description: p.description || "",
  }));

  // 处理 Transfer 变化
  const handleTransferChange = async (targetKeys: string[]) => {
    if (!selectedRole) return;

    const targetIds = targetKeys.map((k) => parseInt(k));
    const currentIds = rolePermissions;

    // 新增的权限
    const toAdd = targetIds.filter((id) => !currentIds.includes(id));
    // 移除的权限
    const toRemove = currentIds.filter((id) => !targetIds.includes(id));

    for (const id of toAdd) {
      await handleGrantPermission(id);
    }

    for (const id of toRemove) {
      await handleRevokePermission(id);
    }
  };

  const roleColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "角色名称",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Role) => (
        <Space>
          <UserOutlined />
          <a onClick={() => loadRoleDetails(record.id)}>{text}</a>
        </Space>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      render: (text: string) => text || "-",
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: unknown, record: Role) => (
        <Can
          I="delete"
          a="Role"
          fallback={
            <Button type="link" danger disabled>
              删除
            </Button>
          }
        >
          <Popconfirm
            title="确定删除此角色？"
            onConfirm={() => handleDeleteRole(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Can>
      ),
    },
  ];

  const permissionColumns = [
    {
      title: "权限名称",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      render: (text: string) => text || "-",
    },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card
          title={
            <>
              <UserOutlined /> 角色管理
            </>
          }
          extra={
            <Can I="create" a="Role" fallback={null}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                创建角色
              </Button>
            </Can>
          }
        >
          <Table
            columns={roleColumns}
            dataSource={roles}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="small"
          />
        </Card>

        {selectedRole && (
          <Card
            title={
              <>
                <KeyOutlined /> {selectedRole.name} - 权限配置
              </>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadRoleDetails(selectedRole.id)}
              >
                刷新
              </Button>
            }
          >
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="角色名称">
                {selectedRole.name}
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                {selectedRole.description || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="已有权限">
                {selectedRole.permissions.length} 个
              </Descriptions.Item>
            </Descriptions>

            <Can I="manage" a="Role">
              <Transfer
                dataSource={transferData}
                titles={["可授权限", "已授权限", "权限描述"]}
                targetKeys={rolePermissions as any}
                onChange={(targetKeys) =>
                  handleTransferChange(targetKeys as string[])
                }
                render={(item) => (
                  <span>
                    <span style={{ fontWeight: 500 }}>{item.title}</span>
                    {item.description ? (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: token.colorTextTertiary,
                        }}
                      >
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                )}
                listStyle={{
                  width: 450,
                  height: 400,
                }}
              />
            </Can>
          </Card>
        )}
      </Space>

      {/* 创建角色 Modal */}
      <Modal
        title="创建角色"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={handleCreateRole}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: "请输入角色名称" }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入角色描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default PermissionManagement;
