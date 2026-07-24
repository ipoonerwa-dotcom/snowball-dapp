export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const ORACLE_ABI = [
  { type: "function", name: "snowballUsdPrice", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lastUsdPrice", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

/** PancakeSwap V2 路由(仅前端报价用) */
export const PANCAKE_ABI = [
  {
    type: "function", name: "getAmountsOut", stateMutability: "view",
    inputs: [{ name: "amountIn", type: "uint256" }, { name: "path", type: "address[]" }],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

/** SnowballBuyRouter:买入 + 绑定邀请人 + 直推返佣 */
export const BUY_ROUTER_ABI = [
  // reads
  { type: "function", name: "referrerOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "rank", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint8" }] },
  { type: "function", name: "rateOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint16" }] },
  { type: "function", name: "teamUsd", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "directCount", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "owed", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimed", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimable", stateMutability: "view", inputs: [{ name: "referrer", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "referralPool", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "buyOpen", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  // writes
  { type: "function", name: "bindReferrer", stateMutability: "nonpayable", inputs: [{ name: "referrer", type: "address" }], outputs: [] },
  { type: "function", name: "buy", stateMutability: "payable", inputs: [{ name: "referrer", type: "address" }, { name: "minTokensOut", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimCommission", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const STAKING_ABI = [
  // ---- reads ----
  { type: "function", name: "rewardReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rewardPaid", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalPrincipal", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "stakingOpen", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "currentDayIdx", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lastPokeTime", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "oracle", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "positionCount", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "positions", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }, { name: "i", type: "uint256" }],
    outputs: [
      { name: "principal", type: "uint256" },
      { name: "rewardUsdPerDay", type: "uint256" },
      { name: "startDayIdx", type: "uint256" },
      { name: "termDays", type: "uint256" },
      { name: "claimedThruIdx", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "principalWithdrawn", type: "bool" },
    ],
  },
  { type: "function", name: "pendingReward", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "posId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  // ---- writes ----
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "termDays", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimReward", stateMutability: "nonpayable", inputs: [{ name: "posId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "withdrawPrincipal", stateMutability: "nonpayable", inputs: [{ name: "posId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "fundReward", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
] as const;
