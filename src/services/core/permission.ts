/**
 * Core Service 权限服务
 */

import { coreRequest } from "../../utils/request";
import { CORE_API } from "./constants";
import type {
  ApiResponse,
  Permission,
  Role,
  RoleWithPermissions,
  UserWithRoles,
} from "./types";

/**
 * 获取所有权限
 */
export async function getAllPermissions(): Promise<ApiResponse<Permission[]>> {
  return coreRequest(CORE_API.PERMISSION.LIST);
}

/**
 * 创建权限
 */
export async function createPermission(
  name: string,
  description?: string,
): Promise<ApiResponse<Permission>> {
  return coreRequest(CORE_API.PERMISSION.CREATE, {
    method: "POST",
    body: { name, description },
  });
}

/**
 * 获取权限详情
 */
export async function getPermission(
  id: number,
): Promise<ApiResponse<Permission>> {
  return coreRequest(CORE_API.PERMISSION.GET(id));
}

/**
 * 更新权限
 */
export async function updatePermission(
  id: number,
  name: string,
  description?: string,
): Promise<ApiResponse<Permission>> {
  return coreRequest(CORE_API.PERMISSION.UPDATE(id), {
    method: "PUT",
    body: { name, description },
  });
}

/**
 * 删除权限
 */
export async function deletePermission(id: number): Promise<ApiResponse<void>> {
  return coreRequest(CORE_API.PERMISSION.DELETE(id), {
    method: "DELETE",
  });
}

/**
 * 获取所有角色
 */
export async function getAllRoles(): Promise<ApiResponse<Role[]>> {
  return coreRequest(CORE_API.ROLE.LIST);
}

/**
 * 获取角色详情（包括权限）
 */
export async function getRoleWithPermissions(
  id: number,
): Promise<ApiResponse<RoleWithPermissions>> {
  return coreRequest(CORE_API.ROLE.GET(id));
}

/**
 * 创建角色
 */
export async function createRole(
  name: string,
  description?: string,
): Promise<ApiResponse<Role>> {
  return coreRequest(CORE_API.ROLE.CREATE, {
    method: "POST",
    body: { name, description },
  });
}

/**
 * 更新角色
 */
export async function updateRole(
  id: number,
  name: string,
  description?: string,
): Promise<ApiResponse<Role>> {
  return coreRequest(CORE_API.ROLE.UPDATE(id), {
    method: "PUT",
    body: { name, description },
  });
}

/**
 * 删除角色
 */
export async function deleteRole(id: number): Promise<ApiResponse<void>> {
  return coreRequest(CORE_API.ROLE.DELETE(id), {
    method: "DELETE",
  });
}

/**
 * 为角色授予权限
 */
export async function grantPermission(
  roleId: number,
  permissionId: number,
): Promise<ApiResponse<void>> {
  return coreRequest(CORE_API.ROLE.GRANT_PERMISSION(roleId), {
    method: "POST",
    body: { permissionId },
  });
}

/**
 * 撤销角色权限
 */
export async function revokePermission(
  roleId: number,
  permissionId: number,
): Promise<ApiResponse<void>> {
  return coreRequest(CORE_API.ROLE.REVOKE_PERMISSION(roleId, permissionId), {
    method: "DELETE",
  });
}

/**
 * 为用户分配角色
 */
export async function assignRole(
  userId: number,
  roleId: number,
): Promise<ApiResponse<void>> {
  return coreRequest(CORE_API.USER_PERMISSION.ASSIGN_ROLE(userId), {
    method: "POST",
    body: { roleId },
  });
}

/**
 * 撤销用户角色
 */
export async function revokeUserRole(
  userId: number,
  roleId: number,
): Promise<ApiResponse<void>> {
  return coreRequest(CORE_API.USER_PERMISSION.REVOKE_ROLE(userId, roleId), {
    method: "DELETE",
  });
}

/**
 * 获取用户的角色和权限
 */
export async function getUserPermissions(
  userId: number,
): Promise<ApiResponse<UserWithRoles>> {
  return coreRequest(CORE_API.USER_PERMISSION.GET_PERMISSIONS(userId));
}
