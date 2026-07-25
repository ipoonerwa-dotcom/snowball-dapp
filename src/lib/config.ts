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
/** 签约合约 / TWAP 预言机(BSC 主网 2026-07-25 v2:支持直接转账注资;env 可覆盖) */
export const STAKING = addr(process.env.NEXT_PUBLIC_STAKING, "0xe04ca7Abe8B8FA905E12678e7Df1F506f88BBc55");
export const ORACLE = addr(process.env.NEXT_PUBLIC_ORACLE, "0x66A3266017446b5F4aACEaC60de7b29eb5508500");

/** 合约齐了才开放交互,否则前端走"待部署"展示态 */
export const DEPLOYED = STAKING !== ZERO && ORACLE !== ZERO;

/** 买入/邀请:buy-router(BSC 主网已部署 2026-07-24;env 可覆盖) */
export const BUY_ROUTER = addr(process.env.NEXT_PUBLIC_BUY_ROUTER, "0x3B9C23beFeA243A17769E462EcE630c8A2AC87ff");
export const REFERRAL_ENABLED = BUY_ROUTER !== ZERO;

/** PancakeSwap V2 路由 + WBNB(仅用于前端报价 getAmountsOut;真正兑换在 buy-router 内) */
export const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E" as const;
export const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as const;

/** SNOWBALL/WBNB 底池 + Chainlink BNB/USD:前端算"实时市场价"用(SNOW = token0) */
export const PAIR = "0x428D3Effb5Cc4F8B9494d44CC0f91D97804dfcD5" as const;
export const BNB_FEED = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE" as const;

/** 团队等级(雪球系),与合约 rateBps[0..5]=5%..10% 一一对应 */
export const TIERS = [
  { name: "雪花", rate: 5 },
  { name: "雪球", rate: 6 },
  { name: "雪坡", rate: 7 },
  { name: "雪崩", rate: 8 },
  { name: "冰川", rate: 9 },
  { name: "雪峰", rate: 10 },
] as const;

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
