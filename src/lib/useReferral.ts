"use client";

import { useEffect, useState } from "react";
import { formatUnits, isAddress } from "viem";
import { useAccount, usePublicClient, useReadContracts } from "wagmi";
import { RECORDER_ABI } from "./recorderAbi";
import { STAKING_ABI } from "./abis";
import { BUY_ROUTER, CHAIN_ID, REFERRAL_ENABLED, STAKING, ZERO } from "./config";

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

/**
 * 我的直推业绩:找出所有上级是我的地址,把他们的【有效业绩】加起来。
 * 有效业绩 = 累计买入USD × 留存比例(留存 = 钱包余额 + 未取回质押本金,按累计买到量封顶),
 * 与后台发放清单、keeper 完全同口径 —— 下线卖出多少就少算多少。
 *
 * 链上没有"某人的直推列表"这个映射,所以先枚举全部参与者再筛;
 * 好在 getUsers + buyerSnapshots 都是批量接口,总共两三次调用就能拿完。
 */
export function useDirectStats() {
  const { address } = useAccount();
  const me = (address ?? "").toLowerCase();
  const client = usePublicClient({ chainId: CHAIN_ID });
  const [directUsd, setDirectUsd] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (!client || !REFERRAL_ENABLED || !me) { setDirectUsd(0); return; }
      setLoading(true);
      try {
        const n = Number((await client.readContract({
          address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "usersLength",
        })) as bigint);
        if (!n) { if (!dead) setDirectUsd(0); return; }

        const all: `0x${string}`[] = [];
        for (let off = 0; off < n; off += 300) {
          const page = (await client.readContract({
            address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "getUsers", args: [BigInt(off), 300n],
          })) as readonly `0x${string}`[];
          all.push(...page);
        }

        // 一次批量拿到 上级 / 累计买入 / 累计到手 / 当前持有
        const mine: { a: `0x${string}`; usd: bigint; tok: bigint; held: bigint }[] = [];
        for (let i = 0; i < all.length; i += 150) {
          const slice = all.slice(i, i + 150);
          const [refs, boughtUsd, boughtTok, held] = (await client.readContract({
            address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "buyerSnapshots", args: [slice],
          })) as [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly bigint[]];
          slice.forEach((u, k) => {
            if (refs[k].toLowerCase() === me && boughtTok[k] > 0n) {
              mine.push({ a: u, usd: boughtUsd[k], tok: boughtTok[k], held: held[k] });
            }
          });
        }

        // 质押也算持有(买了去签约是最强留存证明)
        let total = 0;
        for (const d of mine) {
          let staked = 0n;
          try {
            const cnt = (await client.readContract({
              address: STAKING, abi: STAKING_ABI, functionName: "positionCount", args: [d.a],
            })) as bigint;
            for (let i = 0n; i < cnt; i++) {
              const p = (await client.readContract({
                address: STAKING, abi: STAKING_ABI, functionName: "positions", args: [d.a, i],
              })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
              if (!p[6]) staked += p[0];
            }
          } catch { /* 读不到就按 0 处理 */ }
          const kept = d.held + staked;
          const retained = kept < d.tok ? kept : d.tok;
          total += Number(formatUnits((d.usd * retained) / d.tok, 18));
        }
        if (!dead) setDirectUsd(total);
      } catch {
        if (!dead) setDirectUsd(0);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, [client, me]);

  return { directUsd, loading };
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
