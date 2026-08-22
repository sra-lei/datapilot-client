/**
 * 路由配置
 */

import { createBrowserRouter, Navigate, RouteObject } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import About from "../pages/About";
import Dashboard from "../pages/Dashboard";
import DocIngest from "../pages/DocIngest";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import PermissionManagement from "../pages/Permissions";
import Profile from "../pages/Profile";
import RagDashboard from "../pages/RagDashboard";
import Register from "../pages/Register";
import SystemSettings from "../pages/Settings";
import UserManagement from "../pages/Users";
import ProtectedRoute from "./ProtectedRoute";

// 注意：登录态校验已封装在 ProtectedRoute 组件内（读取 localStorage.user），
// 此处不重复声明 isAuthenticated，避免 noUnusedLocals 报错。

// 公共路由（未登录也可访问）
const publicRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
];

// 受保护的路由（需要登录）
const protectedRoutes: RouteObject[] = [
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/rag-dashboard",
        element: <RagDashboard />,
      },
      {
        path: "/doc-ingest",
        element: <DocIngest />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/users",
        element: <UserManagement />,
      },
      {
        path: "/permissions",
        element: <PermissionManagement />,
      },
      {
        path: "/settings",
        element: <SystemSettings />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

// 路由配置
const routes: RouteObject[] = [...publicRoutes, ...protectedRoutes];

export const router = createBrowserRouter(routes);
