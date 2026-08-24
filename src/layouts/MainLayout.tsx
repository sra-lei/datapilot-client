/**
 * 主布局组件
 */

import ChatWidget from "@/components/ChatWidget";
import { getThemeConfig } from "@/config/theme";
import {
  AuditOutlined,
  BarChartOutlined,
  BulbOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import {
  Avatar,
  ConfigProvider,
  Dropdown,
  Layout,
  Menu,
  Space,
  Switch,
  Tooltip,
} from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePermission } from "../contexts/PermissionContext";

const { Header, Sider, Content } = Layout;

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermission();

  // 主题切换
  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const allMenuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "仪表盘",
      permission: null, // 所有人可见
    },
    {
      key: "doc-eval-group",
      icon: <ExperimentOutlined />,
      label: "文档与评测",
      permission: null,
      children: [
        {
          key: "/doc-ingest",
          icon: <InboxOutlined />,
          label: "文档入库",
          permission: null,
        },
        {
          key: "/rag-dashboard",
          icon: <BarChartOutlined />,
          label: "评估看板",
          permission: null,
        },
        {
          key: "/eval-sets",
          icon: <AuditOutlined />,
          label: "评估集管理",
          permission: { action: "read", subject: "Eval" },
        },
        {
          key: "/eval-runs",
          icon: <HistoryOutlined />,
          label: "评估历史",
          permission: null,
        },
      ],
    },
    {
      key: "/users",
      icon: <UserOutlined />,
      label: "用户管理",
      permission: { action: "read", subject: "User" },
    },
    {
      key: "/permissions",
      icon: <SafetyCertificateOutlined />,
      label: "权限管理",
      permission: { action: "read", subject: "Role" },
    },
    {
      key: "settings-group",
      icon: <SettingOutlined />,
      label: "系统设置",
      permission: { action: "manage", subject: "Settings" },
      children: [
        {
          key: "/settings",
          icon: <SettingOutlined />,
          label: "CharterMate",
        },
      ],
    },
    {
      key: "/about",
      icon: <InfoCircleOutlined />,
      label: "关于",
      permission: null,
    },
  ];

  // 根据权限过滤菜单（支持子菜单）
  const filterMenuItems = (items: any[]): any[] => {
    return items
      .filter((item) => {
        // 如果没有权限要求，所有人都可见
        if (!item.permission) return true;
        // 检查权限
        return can(item.permission.action, item.permission.subject);
      })
      .map((item) => {
        // 如果有子菜单，递归过滤子菜单
        if (item.children) {
          const filteredChildren = filterMenuItems(item.children);
          // 如果子菜单过滤后为空，返回 null（后续会过滤掉）
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }
        return item;
      })
      .filter(Boolean); // 过滤掉 null 值
  };

  const menuItems = filterMenuItems(allMenuItems);

  // 子页面（如 /eval-sets/:id）高亮对应菜单项
  const selectedKey = location.pathname.startsWith("/eval-sets")
    ? "/eval-sets"
    : location.pathname;

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 获取用户信息
  const getUserInfo = () => {
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

  const userInfo = getUserInfo();
  const username = userInfo?.username || "用户";

  // 用户下拉菜单
  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserSwitchOutlined />,
      label: "个人资料",
      onClick: () => navigate("/profile"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      danger: true,
      onClick: () => {
        localStorage.removeItem("user");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("token");
        navigate("/login");
      },
    },
  ];

  return (
    <ConfigProvider theme={getThemeConfig(isDarkMode)}>
      {/*
        外层 Layout 精准锁死视口尺寸（html/body/#root 也已经 overflow:hidden），
        让浏览器级滚动条彻底消失，解决"拉到底继续拉 → 白屏 overscroll"。
        Sider / Header / Content 各自按职责做内部滚动：
          - Sider   : overflow-y:auto（菜单项超出时在左栏内滚）
          - Header  : flexShrink=0（顶栏高度固定，不会被压缩）
          - Content : flex:1 + minHeight:0 + overflow-y:auto（页面内容在这里滚）
      */}
      <Layout
        style={{
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
        }}
      >
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          style={{
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
          {/* 左上角 Logo 区：
              展开时显示 知行（居左）+ 收起按钮（靠右），点击收起侧边栏；
              收起时只显示 Logo 图标，悬停时替换为展开按钮，点击展开侧边栏 */}
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              paddingLeft: collapsed ? 0 : 16,
              gap: 8,
              color: "white",
              fontSize: collapsed ? "16px" : "18px",
              fontWeight: "bold",
              overflow: "hidden",
              cursor: "pointer",
              userSelect: "none",
              background: logoHovered
                ? "rgba(255, 255, 255, 0.08)"
                : "transparent",
              transition: "background 0.2s",
            }}
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {collapsed ? (
              logoHovered ? (
                <MenuUnfoldOutlined style={{ fontSize: 20 }} />
              ) : (
                <img
                  src="/favicon.svg"
                  alt="logo"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
              )
            ) : (
              <>
                <img
                  src="/favicon.svg"
                  alt="logo"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
                <span style={{ whiteSpace: "nowrap" }}>知行</span>
                <MenuFoldOutlined
                  style={{
                    fontSize: 16,
                    marginLeft: "auto",
                    marginRight: 16,
                  }}
                />
              </>
            )}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>
        <Layout
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <Header
            style={{
              flexShrink: 0,
              padding: "0 16px",
              boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <Space size="middle" style={{ marginRight: 16 }}>
              <Tooltip title={isDarkMode ? "切换到浅色模式" : "切换到深色模式"}>
                <Switch
                  checked={isDarkMode}
                  onChange={setIsDarkMode}
                  checkedChildren={<BulbOutlined />}
                  unCheckedChildren={<BulbOutlined />}
                />
              </Tooltip>
            </Space>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <span>{username}</span>
                <Avatar icon={<UserOutlined />} />
              </Space>
            </Dropdown>
          </Header>
          <Content
            style={{
              /* 唯一的「页面外边距」来源：所有子页面（Outlet）不再重复写 padding/margin
                 之前 Content margin 24/16 + padding 24 + 页面根 padding 16~24 → 三层留白吃掉大量宽度
                 现在单边留白统一为 12px：左右各多约 28~40px 可用空间 */
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              padding: 12,
              margin: 0,
              background: "transparent",
            }}
          >
            <Outlet />
          </Content>
        </Layout>
        <ChatWidget />
      </Layout>
    </ConfigProvider>
  );
}

export default MainLayout;
