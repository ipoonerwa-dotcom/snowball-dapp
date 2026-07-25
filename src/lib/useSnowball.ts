"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { ERC20_ABI, FEED_ABI, ORACLE_ABI, PAIR_ABI, STAKING_ABI } from "./abis";
import { BNB_FEED, DEPLOYED, ORACLE, PAIR, STAKING, TOKEN, CHAIN_ID } from "./config";

const POLL = 20_000;
const PREC = 10n ** 18n;

/**
 * 两种 SNOWBALL/USD(都是 1e18):
 *  - price(结算价):预言机每日 poke 定格的 5 分钟均价 —— 合约签约入场/返佣折币用的就是它(防操纵)。
 *  - livePrice(实时价):底池储备比 × Chainlink BNB/USD —— 行情展示用,随市场实时动。
 */
export function usePrice() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: ORACLE, abi: ORACLE_ABI, functionName: "snowballUsdPrice", chainId: CHAIN_ID },
      { address: PAIR, abi: PAIR_ABI, functionName: "getReserves", chainId: CHAIN_ID },
      { address: PAIR, abi: PAIR_ABI, functionName: "token0", chainId: CHAIN_ID },
      { address: BNB_FEED, abi: FEED_ABI, functionName: "latestRoundData", chainId: CHAIN_ID },
      { address: BNB_FEED, abi: FEED_ABI, functionName: "decimals", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: POLL },
  });

  const settle = (data?.[0]?.result as bigint | undefined) ?? 0n;

  let livePrice = 0n;
  const reserves = data?.[1]?.result as readonly [bigint, bigint, bigint] | undefined;
  const token0 = data?.[2]?.result as `0x${string}` | undefined;
  const round = data?.[3]?.result as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const feedDec = data?.[4]?.result as number | undefined;
  if (reserves && token0 && round && feedDec !== undefined && round[1] > 0n) {
    const snowIs0 = token0.toLowerCase() === TOKEN.toLowerCase();
    const rSnow = snowIs0 ? reserves[0] : reserves[1];
    const rWbnb = snowIs0 ? reserves[1] : reserves[0];
    if (rSnow > 0n) {
      const wbnbPerSnow = (rWbnb * PREC) / rSnow; // 1e18
      livePrice = (wbnbPerSnow * round[1]) / 10n ** BigInt(feedDec);
    }
  }

  return { price: settle, livePrice: livePrice > 0n ? livePrice : settle, isLoading };
}

/** 全局数据卡:奖励池剩余 / 签约总额 / 是否开放 */
export function useGlobalStats() {
  const { data } = useReadContracts({
    contracts: [
      { address: STAKING, abi: STAKING_ABI, functionName: "rewardReserve", chainId: CHAIN_ID },
      { address: STAKING, abi: STAKING_ABI, functionName: "totalPrincipal", chainId: CHAIN_ID },
      { address: STAKING, abi: STAKING_ABI, functionName: "stakingOpen", chainId: CHAIN_ID },
      { address: STAKING, abi: STAKING_ABI, functionName: "currentDayIdx", chainId: CHAIN_ID },
      { address: TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [STAKING], chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: POLL },
  });
  const bookedReserve = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const totalPrincipal = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const bal = data?.[4]?.result as bigint | undefined;
  // 有效奖励池 = 合约实际余额 - 本金:社区直接转账进来的币立刻计入(合约领取时会自动 sync 入账,
  // 所以这个口径 = 真正能领到的量;bookedReserve 只是尚未 sync 的账面值,可能滞后)。
  const effective = bal !== undefined && bal > totalPrincipal ? bal - totalPrincipal : bookedReserve;
  return {
    rewardReserve: effective > bookedReserve ? effective : bookedReserve,
    totalPrincipal,
    stakingOpen: (data?.[2]?.result as boolean | undefined) ?? false,
    dayIdx: (data?.[3]?.result as bigint | undefined) ?? 0n,
  };
}

/** 我的余额 + 对签约合约的授权额度 */
export function useWallet() {
  const { address } = useAccount();
  const { data, refetch } = useReadContracts({
    contracts: [
      { address: TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [address ?? "0x0"], chainId: CHAIN_ID },
      { address: TOKEN, abi: ERC20_ABI, functionName: "allowance", args: [address ?? "0x0", STAKING], chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED && !!address, refetchInterval: POLL },
  });
  return {
    balance: (data?.[0]?.result as bigint | undefined) ?? 0n,
    allowance: (data?.[1]?.result as bigint | undefined) ?? 0n,
    refetch,
  };
}

export type Position = {
  id: number;
  principal: bigint;
  rewardUsdPerDay: bigint;
  startDayIdx: bigint;
  termDays: bigint;
  claimedThruIdx: bigint;
  endTime: bigint;
  withdrawn: boolean;
  pending: bigint;
};

/** 我的签约列表(含每单待领奖励) */
export function usePositions() {
  const { address } = useAccount();

  const { data: countData, refetch: refetchCount } = useReadContract({
    address: STAKING,
    abi: STAKING_ABI,
    functionName: "positionCount",
    args: [address ?? "0x0"],
    chainId: CHAIN_ID,
    query: { enabled: DEPLOYED && !!address, refetchInterval: POLL },
  });

  const count = Number((countData as bigint | undefined) ?? 0n);
  const ids = Array.from({ length: count }, (_, i) => BigInt(i));

  const { data, refetch } = useReadContracts({
    contracts: ids.flatMap((i) => [
      { address: STAKING, abi: STAKING_ABI, functionName: "positions" as const, args: [address ?? "0x0", i], chainId: CHAIN_ID },
      { address: STAKING, abi: STAKING_ABI, functionName: "pendingReward" as const, args: [address ?? "0x0", i], chainId: CHAIN_ID },
    ]),
    query: { enabled: DEPLOYED && !!address && count > 0, refetchInterval: POLL },
  });

  const positions: Position[] = [];
  for (let i = 0; i < count; i++) {
    const p = data?.[i * 2]?.result as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean] | undefined;
    const pending = (data?.[i * 2 + 1]?.result as bigint | undefined) ?? 0n;
    if (!p) continue;
    positions.push({
      id: i,
      principal: p[0],
      rewardUsdPerDay: p[1],
      startDayIdx: p[2],
      termDays: p[3],
      claimedThruIdx: p[4],
      endTime: p[5],
      withdrawn: p[6],
      pending,
    });
  }

  return {
    positions,
    count,
    refetch: () => {
      refetchCount();
      refetch();
    },
  };
}
