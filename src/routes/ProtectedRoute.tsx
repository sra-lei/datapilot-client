/**
 * 路由守卫组件
 * 用于保护需要登录才能访问的路由
 */

import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  
  // 检查用户是否已登录
  const isAuthenticated = () => {
    const user = localStorage.getItem('user');
    return user !== null;
  };

  if (!isAuthenticated()) {
    // 未登录，跳转到登录页面，并记录当前路径以便登录后重定向
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
