/**
 * 权限上下文 - 使用 CASL 进行前端权限控制
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { defineAbility, Ability } from '@casl/ability';
import { getUserPermissions } from '../services/core';

interface AuthUser {
  id: number;
  username: string;
  roles: string[];
  permissions: string[];
}

interface PermissionContextType {
  user: AuthUser | null;
  ability: Ability;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  can: (action: string, subject: string) => boolean;
  cannot: (action: string, subject: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

// 创建权限上下文
const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// 创建权限能力
function createAbility(permissions: string[]): Ability {
  return defineAbility((can) => {
    // 定义权限映射
    permissions.forEach((perm) => {
      const [ action, subject ] = perm.split(':');

      if (action === '*' || subject === '*') {
        // 管理员权限 - 拥有所有权限
        can('manage', 'all');
      } else {
        // 根据权限字符串映射到 CASL 动作
        switch (action) {
        case 'user':
          if (subject === 'read') can('read', 'User');
          if (subject === 'create') can('create', 'User');
          if (subject === 'update') can('update', 'User');
          if (subject === 'delete') can('delete', 'User');
          break;
        case 'role':
          if (subject === 'read') can('read', 'Role');
          if (subject === 'create') can('create', 'Role');
          if (subject === 'update') can('update', 'Role');
          if (subject === 'delete') can('delete', 'Role');
          if (subject === 'assign') can('manage', 'Role');
          break;
        case 'database':
          if (subject === 'read') can('read', 'Database');
          if (subject === 'query') can('query', 'Database');
          break;
        case 'system':
          if (subject === 'settings') can('manage', 'Settings');
          break;
        case 'eval':
          if (subject === 'read') can('read', 'Eval');
          if (subject === 'write') can('write', 'Eval');
          break;
        case 'doc':
          // doc:ingest → 文档入库（与评估域权限分离：入库 / 评估两拨人）
          if (subject === 'ingest') can('ingest', 'Doc');
          break;
        }
      }
    });
  });
}

// Provider 组件
export function PermissionProvider({ children }: { children: ReactNode }) {
  const [ user, setUser ] = useState<AuthUser | null>(null);
  const [ ability, setAbility ] = useState<Ability>(() => createAbility([]));
  const [ isLoading, setIsLoading ] = useState(false);

  // 检查本地存储中的用户信息
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setAbility(createAbility(userData.permissions || []));
      } catch (error) {
        console.error('解析用户信息失败', error);
      }
    }
  }, []);

  // 更新权限能力
  useEffect(() => {
    if (user?.permissions) {
      setAbility(createAbility(user.permissions));
    }
  }, [ user?.permissions ]);

  // 从服务器刷新权限
  const refreshPermissions = async() => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await getUserPermissions(user.id);
      if (response.success && response.data) {
        const updatedUser = {
          ...user,
          roles: response.data.roles.map((r) => r.name),
          permissions: response.data.permissions,
        };
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('刷新权限失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  // CASL 的 can 方法
  const can = (action: string, subject: string): boolean => {
    try {
      return ability.can(action as any, subject as any);
    } catch {
      return false;
    }
  };

  // CASL 的 cannot 方法
  const cannot = (action: string, subject: string): boolean => {
    try {
      return ability.cannot(action as any, subject as any);
    } catch {
      return true;
    }
  };

  const value: PermissionContextType = {
    user,
    ability,
    isLoading,
    setUser,
    can,
    cannot,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// 自定义 Hook
export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission 必须在 PermissionProvider 内使用');
  }
  return context;
}

// 便捷的权限检查 Hook
export function useAbility() {
  const { can, cannot, ability } = usePermission();
  return { can, cannot, ability };
}
