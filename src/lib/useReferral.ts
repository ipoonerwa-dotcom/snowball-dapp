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
 * 我的【直推业绩】和【团队业绩】—— 两个都实时读链算,不依赖 keeper。
 *
 * 为什么不用链上 teamUsd:那个值由 keeper 每 15 分钟推一次,而直推业绩是实时算的。
 * 两个数新鲜度不一样,会出现"直推 $2.28、团队 $0"这种看着像坏了的画面
 * (团队业绩逻辑上必须 ≥ 直推业绩)。所以两个都实时算,永远自洽。
 *
 * 有效业绩 = 累计买入USD × 留存比例(留存 = 钱包余额 + 未取回质押本金,按累计买到量封顶),
 * 与后台发放清单、keeper 同口径 —— 下线卖出多少就少算多少。
 */
export function useDirectStats() {
  const { address } = useAccount();
  const me = (address ?? "").toLowerCase();
  const client = usePublicClient({ chainId: CHAIN_ID });
  const [directUsd, setDirectUsd] = useState(0);
  const [teamUsd, setTeamUsd] = useState(0);
  // 团队质押业绩(社区团队长要看的:下线一共签约了多少币 / 折多少 U)
  const [teamStakedTok, setTeamStakedTok] = useState(0);
  const [teamStakedUsd, setTeamStakedUsd] = useState(0);
  const [directStakedTok, setDirectStakedTok] = useState(0);
  const [directStakedUsd, setDirectStakedUsd] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let dead = false;
    async function run() {
      if (!client || !REFERRAL_ENABLED || !me) {
        setDirectUsd(0); setTeamUsd(0);
        setTeamStakedTok(0); setTeamStakedUsd(0); setDirectStakedTok(0); setDirectStakedUsd(0);
        return;
      }
      setLoading(true);
      try {
        const n = Number((await client.readContract({
          address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "usersLength",
        })) as bigint);
        if (!n) { if (!dead) { setDirectUsd(0); setTeamUsd(0); } return; }

        const all: `0x${string}`[] = [];
        for (let off = 0; off < n; off += 300) {
          const page = (await client.readContract({
            address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "getUsers", args: [BigInt(off), 300n],
          })) as readonly `0x${string}`[];
          all.push(...page);
        }

        // 一次批量拿到全员的 上级 / 累计买入 / 累计到手 / 当前持有
        const snap = new Map<string, { usd: bigint; tok: bigint; held: bigint }>();
        const children = new Map<string, string[]>();
        for (let i = 0; i < all.length; i += 150) {
          const slice = all.slice(i, i + 150);
          const [refs, boughtUsd, boughtTok, held] = (await client.readContract({
            address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "buyerSnapshots", args: [slice],
          })) as [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly bigint[]];
          slice.forEach((u, k) => {
            const lu = u.toLowerCase();
            snap.set(lu, { usd: boughtUsd[k], tok: boughtTok[k], held: held[k] });
            const ref = refs[k].toLowerCase();
            if (ref !== ZERO.toLowerCase()) {
              if (!children.has(ref)) children.set(ref, []);
              children.get(ref)!.push(lu);
            }
          });
        }

        // 我的直推 + 整条下线(带环保护:互绑时不把祖先当子节点,否则自己的买入会算进自己团队)
        const directs = children.get(me) ?? [];
        const team: string[] = [];
        const inProg = new Set<string>([me]);
        const walk = (u: string) => {
          for (const c of children.get(u) ?? []) {
            if (inProg.has(c)) continue;
            inProg.add(c);
            team.push(c);
            walk(c);
          }
        };
        walk(me);

        // 只对"真买过币"的人读质押(质押也算持有),把调用量限制在自己的下线里
        const buyers = team.filter((u) => (snap.get(u)?.tok ?? 0n) > 0n);
        const qualified = new Map<string, number>();
        // 团队质押业绩:就在下面这个已有的仓位遍历里顺手累计,不额外发请求。
        // 口径与「我的签约」那张卡一致 —— 币按 principal,U 按入场价锁定的本金 U 值
        // (= 奖励总额 ÷ 费率,30 天 +10% / 60 天 +25%),这样团队长看到的和成员自己看到的对得上。
        // 只算【未取回】的仓位:已到期取回的不该再算作在场业绩。
        const stakedTokOf = new Map<string, number>();
        const stakedUsdOf = new Map<string, number>();
        for (const u of buyers) {
          const s = snap.get(u)!;
          let staked = 0n;
          let uTok = 0n;
          let uUsd = 0n;
          try {
            const cnt = (await client.readContract({
              address: STAKING, abi: STAKING_ABI, functionName: "positionCount", args: [u as `0x${string}`],
            })) as bigint;
            for (let i = 0n; i < cnt; i++) {
              const p = (await client.readContract({
                address: STAKING, abi: STAKING_ABI, functionName: "positions", args: [u as `0x${string}`, i],
              })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
              if (!p[6]) {
                staked += p[0];
                uTok += p[0];
                const rateBps = p[3] === 60n ? 2500n : 1000n;
                uUsd += (p[1] * p[3] * 10000n) / rateBps;
              }
            }
          } catch { /* 读不到按 0 处理 */ }
          stakedTokOf.set(u, Number(formatUnits(uTok, 18)));
          stakedUsdOf.set(u, Number(formatUnits(uUsd, 18)));
          const kept = s.held + staked;
          const retained = kept < s.tok ? kept : s.tok;
          qualified.set(u, Number(formatUnits((s.usd * retained) / s.tok, 18)));
        }

        const sum = (list: string[]) => list.reduce((t, u) => t + (qualified.get(u) ?? 0), 0);
        const sumBy = (list: string[], m: Map<string, number>) => list.reduce((t, u) => t + (m.get(u) ?? 0), 0);
        if (!dead) {
          setDirectUsd(sum(directs));
          setTeamUsd(sum(team));
          setDirectStakedTok(sumBy(directs, stakedTokOf));
          setDirectStakedUsd(sumBy(directs, stakedUsdOf));
          setTeamStakedTok(sumBy(team, stakedTokOf));
          setTeamStakedUsd(sumBy(team, stakedUsdOf));
        }
      } catch {
        /* 读失败保持上一次的值,不要闪回 0 */
      } finally {
        if (!dead) setLoading(false);
      }
    }
    run();
    // 新买入要能自动反映,不用手动刷新页面
    const t = setInterval(run, 30_000);
    return () => { dead = true; clearInterval(t); };
  }, [client, me]);

  return { directUsd, teamUsd, directStakedTok, directStakedUsd, teamStakedTok, teamStakedUsd, loading };
}

export type ReferralState = {
  referrer: `0x${string}`;   // 我的邀请人(0 = 未绑定)
  bound: boolean;
  /** referrerOf 已读回。false = 还在加载,别拿它当“没绑过”用 */
  boundReady: boolean;
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

  const rawReferrer = data?.[0]?.result as `0x${string}` | undefined;
  const referrer = rawReferrer ?? ZERO;
  const teamUsdWei = data?.[3]?.result as bigint | undefined;
  const myUsdWei = data?.[4]?.result as bigint | undefined;

  return {
    referrer,
    bound: referrer !== ZERO,
    /**
     * referrerOf 是否已经读回来了。
     *
     * 【为什么必须有这个】首帧 data 还是 undefined → referrer 落到 ZERO → bound=false,
     * 于是"还没绑过"这个判断在数据到达之前就成立了。自动绑定那段一看 !bound 就直接发交易,
     * 老用户带 ?ref= 链接进来必然撞 `already bound` 报错框(线上真实反馈,
     * 0xFa4A…21e0 已绑 0xa666…D419 却仍被弹了一次绑定)。
     * 任何"没绑过才做"的动作都必须先等 boundReady。
     */
    boundReady: rawReferrer !== undefined,
    rank: Number((data?.[1]?.result as number | undefined) ?? 0),
    directCount: Number((data?.[2]?.result as bigint | undefined) ?? 0n),
    myBuyUsd: Number(formatUnits(myUsdWei ?? 0n, 18)),
    teamUsd: REFERRAL_ENABLED && address ? Number(formatUnits(teamUsdWei ?? 0n, 18)) : null,
    buyOpen: (data?.[5]?.result as boolean | undefined) ?? false,
    refetch,
  };
}
