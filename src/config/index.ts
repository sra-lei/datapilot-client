/**
 * 配置管理模块
 * 统一管理环境变量和服务器配置
 */

// 服务器类型枚举
export enum ServerType {
  CORE = 'core',           // Core Service（Node.js Server）
  CHARTERMATE = 'chartermate',   // CharterMate Service（Python Server）
}

// 服务器配置接口
export interface ServerConfig {
  host: string;
  port: number;
  url: string;
}

// 应用配置接口
export interface AppConfig {
  title: string;
  version: string;
  apiPrefix: string;
  enableMock: boolean;
  servers: Record<ServerType, ServerConfig>;
}

// 从环境变量获取配置
const getEnv = (key: string, defaultValue?: string): string => {
  return import.meta.env[key] ?? defaultValue ?? '';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  return value ? value === 'true' : defaultValue;
};

// 应用配置实例
export const config: AppConfig = {
  title: getEnv('VITE_APP_TITLE', 'InsightForge Management'),
  version: getEnv('VITE_APP_VERSION', '1.0.0'),
  apiPrefix: getEnv('VITE_API_PREFIX', '/core'),
  enableMock: getEnvBoolean('VITE_ENABLE_MOCK', false),
  servers: {
    [ServerType.CORE]: {
      host: getEnv('VITE_SERVER_CORE_HOST', 'localhost'),
      port: getEnvNumber('VITE_SERVER_CORE_PORT', 3002),
      url: getEnv('VITE_SERVER_CORE_URL', 'http://localhost:3002'),
    },
    [ServerType.CHARTERMATE]: {
      host: getEnv('VITE_SERVER_CHARTERMATE_HOST', 'localhost'),
      port: getEnvNumber('VITE_SERVER_CHARTERMATE_PORT', 8000),
      url: getEnv('VITE_SERVER_CHARTERMATE_URL', 'http://localhost:8000'),
    },
  },
};

// 获取服务器基础 URL
export const getServerUrl = (serverType: ServerType): string => {
  return config.servers[serverType].url;
};

// 获取服务器完整 API 路径
export const getServerApiUrl = (serverType: ServerType, path: string): string => {
  const serverUrl = config.servers[serverType].url;
  return `${serverUrl}${path}`;
};

export default config;