/**
 * 权限控制组件 - 基于 CASL
 */

import { ReactNode } from 'react';
import { useAbility } from '../contexts/PermissionContext';

interface CanProps {
  I: string; // action
  a?: string; // subject
  not?: boolean; // 取反
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 条件渲染组件 - 根据权限显示/隐藏内容
 * @example
 * <Can I="create" a="User">
 *   <Button>创建用户</Button>
 * </Can>
 */
export function Can({ I, a = 'all', not = false, children, fallback = null }: CanProps) {
  const { can } = useAbility();

  const hasPermission = can(I, a);

  if (not) {
    return hasPermission ? (fallback as any) : (children as any);
  }

  return hasPermission ? (children as any) : (fallback as any);
}

/**
 * 权限保护组件 - 权限不足时显示提示
 * @example
 * <Can I="delete" a="User" fallback={<div>没有权限</div>}>
 *   <Button danger>删除用户</Button>
 * </Can>
 */
export function CanAction({ I, a = 'all', children, fallback = null }: Omit<CanProps, 'not'>) {
  return <Can I={I} a={a} fallback={fallback}>{children}</Can>;
}

interface CannotProps {
  I: string;
  a?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 权限禁止组件 - 权限不足时显示内容
 * @example
 * <Cannot I="delete" a="User" fallback={<div>无法删除</div>}>
 *   <Button>删除用户</Button>
 * </Cannot>
 */
export function Cannot({ I, a = 'all', children, fallback = null }: CannotProps) {
  return <Can I={I} a={a} not fallback={fallback}>{children}</Can>;
}
