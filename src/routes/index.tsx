/**
 * 路由配置
 */

import { createBrowserRouter, RouteObject } from 'react-router-dom';
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

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <MainLayout />,
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

export const router = createBrowserRouter(routes);
