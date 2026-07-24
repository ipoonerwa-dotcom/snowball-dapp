export const ZERO = "0x0000000000000000000000000000000000000000" as const;

function addr(v: string | undefined, fallback: string = ZERO): `0x${string}` {
  const s = (v ?? "").trim();
  return (/^0x[0-9a-fA-F]{40}$/.test(s) ? s : fallback) as `0x${string}`;
}

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 56);
export const RPC_URL = process.env.NEXT_PUBLIC_RPC || "https://bsc-dataseed.bnbchain.org";
export const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || "").trim();

/** SNOWBALL 代币(BSC 主网已上线) */
export const TOKEN = addr(process.env.NEXT_PUBLIC_TOKEN, "0x4De6554be9eB837112646E6367aAE2EbB32daAAA");
/** 签约合约 / TWAP 预言机(BSC 主网已部署 2026-07-24;env 可覆盖) */
export const STAKING = addr(process.env.NEXT_PUBLIC_STAKING, "0xD01870FFD8Af16FEB1Cd282e0878e8B32B93Fb64");
export const ORACLE = addr(process.env.NEXT_PUBLIC_ORACLE, "0x66A3266017446b5F4aACEaC60de7b29eb5508500");

/** 合约齐了才开放交互,否则前端走"待部署"展示态 */
export const DEPLOYED = STAKING !== ZERO && ORACLE !== ZERO;

export const REWARD_POOL_TARGET = Number(process.env.NEXT_PUBLIC_REWARD_POOL_TARGET ?? 40000);

export const EXPLORER = CHAIN_ID === 56 ? "https://bscscan.com" : "https://testnet.bscscan.com";

/** 与合约常量一一对应:RATE_30D_BPS=1000 / RATE_60D_BPS=2500 */
export const TERMS = [
  { days: 30, rateBps: 1000, label: "30 天", peak: false },
  { days: 60, rateBps: 2500, label: "60 天", peak: true },
] as const;

export type Term = (typeof TERMS)[number];

/** 展示用最高年化:60 天档 25% 折年 */
export const MAX_APR_PCT = Math.round((2500 / 100) * (365 / 60));
