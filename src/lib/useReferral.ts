"use client";

import { useEffect, useState } from "react";
import { formatUnits, isAddress } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { RECORDER_ABI } from "./recorderAbi";
import { BUY_ROUTER, CHAIN_ID, REFERRAL_ENABLED, ZERO } from "./config";

const POLL = 20_000;

/** 从 URL ?ref= 读邀请人(客户端;非法/自荐返回 undefined)。 */
export function useUrlRef(): `0x${string}` | undefined {
  const { address } = useAccount();
  const [ref, setRef] = useState<`0x${string}` | undefined>();
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("ref") || "";
      if (isAddress(q)) setRef(q as `0x${string}`);
    } catch {
      /* ignore */
    }
  }, []);
  // 自荐无效
  if (ref && address && ref.toLowerCase() === address.toLowerCase()) return undefined;
  return ref;
}

export type ReferralState = {
  referrer: `0x${string}`;   // 我的邀请人(0 = 未绑定)
  bound: boolean;
  rank: number;              // 0..5(展示用)
  directCount: number;       // 我的直推人数
  myBuyUsd: number;          // 我通过 DApp 的累计买入(USD)
  teamUsd: number | null;    // 团队业绩(keeper 推上链;未推过=0)
  buyOpen: boolean;
  refetch: () => void;
};

/**
 * 返佣改为「项目方按记录人工发放」后,链上不再有 owed / claimable / 领取。
 * 这里只读展示所需的数据:绑定关系、等级、直推数、买入业绩。
 */
export function useReferral(): ReferralState {
  const { address } = useAccount();
  const a = address ?? ZERO;

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "referrerOf", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "rank", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "directCount", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "teamUsd", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "totalUsdOf", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "buyOpen", chainId: CHAIN_ID },
    ],
    query: { enabled: REFERRAL_ENABLED && !!address, refetchInterval: POLL },
  });

  const referrer = (data?.[0]?.result as `0x${string}` | undefined) ?? ZERO;
  const teamUsdWei = data?.[3]?.result as bigint | undefined;
  const myUsdWei = data?.[4]?.result as bigint | undefined;

  return {
    referrer,
    bound: referrer !== ZERO,
    rank: Number((data?.[1]?.result as number | undefined) ?? 0),
    directCount: Number((data?.[2]?.result as bigint | undefined) ?? 0n),
    myBuyUsd: Number(formatUnits(myUsdWei ?? 0n, 18)),
    teamUsd: REFERRAL_ENABLED && address ? Number(formatUnits(teamUsdWei ?? 0n, 18)) : null,
    buyOpen: (data?.[5]?.result as boolean | undefined) ?? false,
    refetch,
  };
}
