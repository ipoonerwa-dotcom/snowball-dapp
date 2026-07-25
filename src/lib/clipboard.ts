/**
 * 健壮复制:兼容钱包内置浏览器(TP/OKX/imToken 等)。
 * 这类 WebView 常处于非安全上下文,navigator.clipboard 为 undefined 或被拒,
 * 直接用会静默失败。三级兜底:
 *  1) navigator.clipboard.writeText(现代安全上下文)
 *  2) 隐藏 textarea + document.execCommand("copy")(老 WebView 主力路径)
 *  3) 都不行 → 返回 false,由调用方提示用户手动长按复制
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  // 1) 现代 API(需要 https 或 localhost 安全上下文)
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 落到下一级 */
  }

  // 2) execCommand 兜底(移动端 WebView 兼容性最好)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS 需要显式设选区
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return true;
  } catch {
    /* 落到最终失败 */
  }

  return false;
}
