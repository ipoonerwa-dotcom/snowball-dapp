"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { BUY_ROUTER_ABI } from "./abis";
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
  rank: number;              // 0..5
  directCount: number;       // 我的直推人数
  owed: bigint;              // 累计待领返佣(SNOWBALL)
  claimable: bigint;         // 当前可领(受池余额限制)
  claimed: bigint;           // 累计已领
  pool: bigint;              // 邀请池余额
  buyOpen: boolean;
  teamUsd: number | null;    // 团队 U 业绩(来自后端;未就绪=null)
  refetch: () => void;
};

export function useReferral(): ReferralState {
  const { address } = useAccount();
  const a = address ?? ZERO;

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "referrerOf", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "rank", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "directCount", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "owed", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "claimable", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "claimed", args: [a], chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "referralPool", chainId: CHAIN_ID },
      { address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "buyOpen", chainId: CHAIN_ID },
    ],
    query: { enabled: REFERRAL_ENABLED && !!address, refetchInterval: POLL },
  });

  // 团队 U 业绩:后端索引器算好后由 /api/team/[address] 提供;未就绪则 null(前端显示"—")。
  const [teamUsd, setTeamUsd] = useState<number | null>(null);
  useEffect(() => {
    if (!address || !REFERRAL_ENABLED) return;
    let alive = true;
    fetch(`/api/team/${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.teamUsd === "number") setTeamUsd(d.teamUsd);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [address]);

  const referrer = (data?.[0]?.result as `0x${string}` | undefined) ?? ZERO;
  return {
    referrer,
    bound: referrer !== ZERO,
    rank: Number((data?.[1]?.result as number | undefined) ?? 0),
    directCount: Number((data?.[2]?.result as bigint | undefined) ?? 0n),
    owed: (data?.[3]?.result as bigint | undefined) ?? 0n,
    claimable: (data?.[4]?.result as bigint | undefined) ?? 0n,
    claimed: (data?.[5]?.result as bigint | undefined) ?? 0n,
    pool: (data?.[6]?.result as bigint | undefined) ?? 0n,
    buyOpen: (data?.[7]?.result as boolean | undefined) ?? false,
    teamUsd,
    refetch,
  };
}
