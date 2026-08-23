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
//  换肤（方案 A：主色单一入口，其余全自动派生）
//  - 新增主题只需加一个 colorPrimary，背景/图表/组件色全部由
//    antd 主色派生机制自动适配，无需手动配置
// ============================================================

export interface ThemePreset {
  key: string;
  name: string;
  colorPrimary: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { key: "blue", name: "科技蓝", colorPrimary: "#1677ff" },
  { key: "geekblue", name: "极客蓝", colorPrimary: "#2f54eb" },
  { key: "cyan", name: "翡翠青", colorPrimary: "#13c2c2" },
  { key: "green", name: "生机绿", colorPrimary: "#52c41a" },
  { key: "orange", name: "活力橙", colorPrimary: "#fa8c16" },
  { key: "purple", name: "皇家紫", colorPrimary: "#722ed1" },
];

export const DEFAULT_PRESET_KEY = "blue";

/** 按 key 取主题预设（未知 key 回退默认） */
export function getThemePresetByKey(key: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.key === key) ?? THEME_PRESETS[0];
}

/**
 * 由主色自动派生浅色页面背景（antd 色板 1 级淡色，如蓝主色 → #e6f4ff）。
 * 任意主色都有配套淡色，新增主题无需手动配背景。
 */
function deriveBgLayout(colorPrimary: string): string {
  try {
    const seed = { ...theme.defaultSeed, colorPrimary };
    return theme.defaultAlgorithm(seed).colorPrimaryBg;
  } catch {
    return lightColors.bodyBg;
  }
}

/**
 * 根据明暗模式 + 主题预设生成 Ant Design 主题配置
 * 浅色模式：页面背景由主色自动派生（colorPrimaryBg）；暗色模式：只换主色，背景沿用 antd 暗色默认。
 */
export function getThemeConfig(
  isDarkMode: boolean,
  preset: ThemePreset = THEME_PRESETS[0],
): ThemeConfig {
  const colors = isDarkMode ? darkColors : lightColors;
  const bgLayout = isDarkMode ? colors.bodyBg : deriveBgLayout(preset.colorPrimary);

  return {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: preset.colorPrimary,
      // 浅色下页面背景跟随主色（自动派生）；暗色下不覆盖（antd dark 默认深色背景）
      ...(isDarkMode ? {} : { colorBgLayout: bgLayout }),
    },
    components: {
      Layout: {
        headerBg: colors.headerBg,
        bodyBg: bgLayout,
        siderBg: colors.siderBg,
        triggerBg: colors.triggerBg,
        triggerColor: colors.triggerColor,
      },
      Menu: {
        darkItemBg: colors.darkItemBg,
        darkSubMenuItemBg: colors.darkSubMenuItemBg,
        // 浅色下侧栏选中高亮跟随主色
        darkItemSelectedBg: isDarkMode ? colors.darkItemSelectedBg : preset.colorPrimary,
      },
    },
  };
}
