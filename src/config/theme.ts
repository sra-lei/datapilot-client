import type { ThemeConfig } from "antd";
import { theme } from "antd";

/**
 * 浅色模式颜色
 */
const lightColors = {
  headerBg: "#ffffff",
  bodyBg: "#f0f2f5",
  siderBg: "#001529",
  triggerBg: "#002140",
  triggerColor: "#ffffff",
  darkItemBg: "#001529",
  darkSubMenuItemBg: "#000c17",
  darkItemSelectedBg: "#1677ff",
};

/**
 * 深色模式颜色
 */
const darkColors = {
  headerBg: "#1f1f1f",
  bodyBg: "#141414",
  siderBg: "#000000",
  triggerBg: "#1f1f1f",
  triggerColor: "#ffffff",
  darkItemBg: "#000000",
  darkSubMenuItemBg: "#000000",
  darkItemSelectedBg: "#1f1f1f",
};

// ============================================================
//  换肤：主题预设（主色 + 图表分类色板）
//  - 主色 colorPrimary 由 ConfigProvider 注入，全站 token 色随动
//  - categoryColors 供 RagDashboard 等图表使用，换肤时整套联动
// ============================================================

export interface ThemePreset {
  key: string;
  name: string;
  colorPrimary: string;
  /** RAG 看板分类色板：事实查询（主色）/ 概念查询 / 理解推理 / 综合概括 */
  categoryColors: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "blue",
    name: "科技蓝",
    colorPrimary: "#1677ff",
    categoryColors: {
      事实查询: "#1677ff",
      概念查询: "#52c41a",
      理解推理: "#722ed1",
      综合概括: "#faad14",
    },
  },
  {
    key: "geekblue",
    name: "极客蓝",
    colorPrimary: "#2f54eb",
    categoryColors: {
      事实查询: "#2f54eb",
      概念查询: "#52c41a",
      理解推理: "#722ed1",
      综合概括: "#fa8c16",
    },
  },
  {
    key: "cyan",
    name: "翡翠青",
    colorPrimary: "#13c2c2",
    categoryColors: {
      事实查询: "#13c2c2",
      概念查询: "#52c41a",
      理解推理: "#722ed1",
      综合概括: "#faad14",
    },
  },
  {
    key: "green",
    name: "生机绿",
    colorPrimary: "#52c41a",
    categoryColors: {
      事实查询: "#52c41a",
      概念查询: "#13c2c2",
      理解推理: "#722ed1",
      综合概括: "#fa8c16",
    },
  },
  {
    key: "orange",
    name: "活力橙",
    colorPrimary: "#fa8c16",
    categoryColors: {
      事实查询: "#fa8c16",
      概念查询: "#52c41a",
      理解推理: "#722ed1",
      综合概括: "#faad14",
    },
  },
  {
    key: "purple",
    name: "皇家紫",
    colorPrimary: "#722ed1",
    categoryColors: {
      事实查询: "#722ed1",
      概念查询: "#52c41a",
      理解推理: "#13c2c2",
      综合概括: "#faad14",
    },
  },
];

export const DEFAULT_PRESET_KEY = "blue";

/** 按 key 取主题预设（未知 key 回退默认） */
export function getThemePresetByKey(key: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.key === key) ?? THEME_PRESETS[0];
}

/**
 * 根据明暗模式 + 主题预设生成 Ant Design 主题配置
 */
export function getThemeConfig(
  isDarkMode: boolean,
  preset: ThemePreset = THEME_PRESETS[0],
): ThemeConfig {
  const colors = isDarkMode ? darkColors : lightColors;

  return {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: preset.colorPrimary,
    },
    components: {
      Layout: {
        headerBg: colors.headerBg,
        bodyBg: colors.bodyBg,
        siderBg: colors.siderBg,
        triggerBg: colors.triggerBg,
        triggerColor: colors.triggerColor,
      },
      Menu: {
        darkItemBg: colors.darkItemBg,
        darkSubMenuItemBg: colors.darkSubMenuItemBg,
        darkItemSelectedBg: colors.darkItemSelectedBg,
      },
    },
  };
}
