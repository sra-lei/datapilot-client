import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './routes';
import { PermissionProvider } from './contexts/PermissionContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={zhCN}>
    <PermissionProvider>
      <RouterProvider router={router} />
    </PermissionProvider>
  </ConfigProvider>
);
