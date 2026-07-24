import { formatUnits } from "viem";

/** 1e18 定点 → number(仅用于展示,不参与链上计算) */
export function toNum(v: bigint | undefined, decimals = 18): number {
  if (v === undefined) return 0;
  return Number(formatUnits(v, decimals));
}

export function fmt(n: number, dp = 2): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** 大数紧凑显示:1.42M / 32.4k */
export function fmtCompact(n: number, dp = 2): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(dp) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(dp) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return fmt(n, dp);
}

export function fmtUsd(n: number, dp = 2): string {
  return "$" + fmtCompact(n, dp);
}

/** 价格小数位自适应:$0.278 / $0.0004123 */
export function fmtPrice(n: number): string {
  if (!n) return "—";
  if (n >= 1) return "$" + fmt(n, 3);
  if (n >= 0.001) return "$" + n.toFixed(4);
  return "$" + n.toPrecision(3);
}

export function shortAddr(a?: string): string {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

/** 剩余时间:3 天 04:12 / 已到期 */
export function countdown(endTimeSec: number, nowSec: number): string {
  const left = endTimeSec - nowSec;
  if (left <= 0) return "已到期";
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  if (d > 0) return `${d} 天 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const s = left % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
