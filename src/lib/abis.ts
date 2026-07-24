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
