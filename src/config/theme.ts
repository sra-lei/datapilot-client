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

/**
 * 根据深色模式状态生成 Ant Design 主题配置
 */
export function getThemeConfig(isDarkMode: boolean): ThemeConfig {
  const colors = isDarkMode ? darkColors : lightColors;

  return {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
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
