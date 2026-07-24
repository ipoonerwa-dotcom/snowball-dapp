"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { ERC20_ABI, ORACLE_ABI, STAKING_ABI } from "./abis";
import { DEPLOYED, ORACLE, STAKING, TOKEN, CHAIN_ID } from "./config";

const POLL = 20_000;

/** SNOWBALL/USD(1e18)。预言机每日 poke 结算,读的是最近一次settled价 */
export function usePrice() {
  const { data, isLoading } = useReadContract({
    address: ORACLE,
    abi: ORACLE_ABI,
    functionName: "snowballUsdPrice",
    chainId: CHAIN_ID,
    query: { enabled: DEPLOYED, refetchInterval: POLL },
  });
  return { price: (data as bigint | undefined) ?? 0n, isLoading };
}

/** 全局数据卡:奖励池剩余 / 签约总额 / 是否开放 */
export function useGlobalStats() {
  const { data } = useReadContracts({
    contracts: [
      { address: STAKING, abi: STAKING_ABI, functionName: "rewardReserve", chainId: CHAIN_ID },
      { address: STAKING, abi: STAKING_ABI, functionName: "totalPrincipal", chainId: CHAIN_ID },
      { address: STAKING, abi: STAKING_ABI, functionName: "stakingOpen", chainId: CHAIN_ID },
      { address: STAKING, abi: STAKING_ABI, functionName: "currentDayIdx", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: POLL },
  });
  return {
    rewardReserve: (data?.[0]?.result as bigint | undefined) ?? 0n,
    totalPrincipal: (data?.[1]?.result as bigint | undefined) ?? 0n,
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
