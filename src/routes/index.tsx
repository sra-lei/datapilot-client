/**
 * 路由配置
 */

import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import DatabaseViewer from '../pages/DatabaseViewer';
import UserManagement from '../pages/Users';
import SystemSettings from '../pages/Settings';
import PermissionManagement from '../pages/Permissions';
import Profile from '../pages/Profile';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';

// 检查是否已登录
const isAuthenticated = () => {
  return localStorage.getItem('user') !== null;
};

// 公共路由（未登录也可访问）
const publicRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
];

// 受保护的路由（需要登录）
const protectedRoutes: RouteObject[] = [
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/database',
        element: <DatabaseViewer />,
      },
      {
        path: '/users',
        element: <UserManagement />,
      },
      {
        path: '/permissions',
        element: <PermissionManagement />,
      },
      {
        path: '/settings',
        element: <SystemSettings />,
      },
      {
        path: '/profile',
        element: <Profile />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

// 路由配置
const routes: RouteObject[] = [
  ...publicRoutes,
  ...protectedRoutes,
];

// 如果已登录，访问登录页时重定向到 dashboard
const rootRoute: RouteObject = {
  path: '/',
  element: isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />,
};

export const router = createBrowserRouter([rootRoute, ...routes]);

