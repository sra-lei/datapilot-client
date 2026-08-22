/**
 * 前端渲染兜底：文本编码修复工具
 * 与 services/core/src/utils/textRepair.ts 实现完全对称。
 * 用途：权限管理 / 用户管理 / 角色管理 等页面的描述列，即使数据库里是历史遗留的
 * "UTF-8→Latin-1 错编码"乱码，也能在渲染时无损还原为中文，不再要求用户删库重建。
 */

function looksLikeLatin1Mojibake(s: string): boolean {
  if (!s) return false;
  let extLatin = 0;
  let cjk = 0;
  const threshold = Math.max(1, Math.floor(s.length / 8));
  for (let i = 0; i < s.length; i += 1) {
    const cp = s.charCodeAt(i);
    if (cp >= 0x0080 && cp <= 0x00ff) extLatin += 1;
    else if (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3000 && cp <= 0x303f) ||
      (cp >= 0xff00 && cp <= 0xffef) ||
      (cp >= 0x3400 && cp <= 0x4dbf)
    ) {
      cjk += 1;
    }
  }
  return cjk === 0 && extLatin >= threshold;
}

export function repairLatin1Mojibake(
  s: string | null | undefined,
): string {
  if (s == null) return "";
  if (typeof s !== "string") return String(s);
  if (!looksLikeLatin1Mojibake(s)) return s;
  try {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i += 1) {
      const cp = s.charCodeAt(i);
      if (cp > 0xff) return s;
      bytes[i] = cp & 0xff;
    }
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return decoder.decode(bytes);
  } catch {
    return s;
  }
}
