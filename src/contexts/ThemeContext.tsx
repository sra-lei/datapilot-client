/**
 * 主题上下文：明暗模式 + 主题预设（主色/分类色板）
 * 由 MainLayout 提供，RagDashboard 等图表组件消费 preset.categoryColors 实现换肤联动。
 */
import { createContext, useContext } from "react";
import type { ThemePreset } from "../config/theme";
import { DEFAULT_PRESET_KEY, getThemePresetByKey } from "../config/theme";

export interface ThemeContextType {
  isDarkMode: boolean;
  preset: ThemePreset;
  setDarkMode: (v: boolean) => void;
  setPreset: (preset: ThemePreset) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme 必须在 ThemeProvider 内使用");
  }
  return ctx;
}

/** 读取持久化的主题预设 key（localStorage "theme_preset"，未知回退默认） */
export function getSavedPresetKey(): string {
  try {
    return localStorage.getItem("theme_preset") ?? DEFAULT_PRESET_KEY;
  } catch {
    return DEFAULT_PRESET_KEY;
  }
}

/** 把主题预设 key 持久化到 localStorage */
export function savePresetKey(key: string): void {
  try {
    localStorage.setItem("theme_preset", key);
  } catch {
    /* ignore */
  }
}

/** 按持久化 key 取预设（供组件初始化用） */
export function getSavedPreset(): ThemePreset {
  return getThemePresetByKey(getSavedPresetKey());
}
