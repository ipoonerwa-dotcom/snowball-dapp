/** SnowballBuyRecorder:只记录不发钱的买入路由(返佣人工发放) */
export const RECORDER_ABI = [
  // ---- 买入 / 绑定 ----
  { type: "function", name: "buy", stateMutability: "payable", inputs: [{ name: "referrer", type: "address" }, { name: "minTokensOut", type: "uint256" }], outputs: [] },
  { type: "function", name: "bindReferrer", stateMutability: "nonpayable", inputs: [{ name: "referrer", type: "address" }], outputs: [] },
  { type: "function", name: "buyOpen", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "referrerOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "directCount", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },

  // ---- 等级展示 ----
  { type: "function", name: "rank", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint8" }] },
  { type: "function", name: "teamUsd", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "rateBps", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint16" }] },
  {
    type: "function", name: "tierOf", stateMutability: "view", inputs: [{ type: "address" }],
    outputs: [{ type: "uint8" }, { type: "string" }, { type: "uint16" }, { type: "uint256" }, { type: "uint256" }],
  },

  // ---- 报表用枚举(全部普通 view,不依赖 getLogs)----
  { type: "function", name: "purchasesLength", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "usersLength", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "getPurchases", stateMutability: "view",
    inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
    outputs: [
      { name: "buyers", type: "address[]" },
      { name: "referrers", type: "address[]" },
      { name: "bnbIn", type: "uint256[]" },
      { name: "usd", type: "uint256[]" },
      { name: "tokens", type: "uint256[]" },
      { name: "times", type: "uint256[]" },
    ],
  },
  {
    type: "function", name: "buyerSnapshots", stateMutability: "view",
    inputs: [{ name: "accounts", type: "address[]" }],
    outputs: [
      { name: "referrers", type: "address[]" },
      { name: "boughtUsd", type: "uint256[]" },
      { name: "boughtTokens", type: "uint256[]" },
      { name: "heldNow", type: "uint256[]" },
    ],
  },
  { type: "function", name: "totalUsdOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "firstSeen", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint64" }] },
] as const;
