"use client";

import { useEffect, useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { STAKING_ABI } from "@/lib/abis";
import { DEPLOYED, STAKING } from "@/lib/config";
import { countdown, fmt, toNum } from "@/lib/format";
import { useGlobalStats, usePositions, useWallet, type Position } from "@/lib/useSnowball";

export default function MyPositions() {
  const config = useConfig();
  const { isConnected } = useAccount();
  const { positions, refetch } = usePositions();
  const { rewardReserve } = useGlobalStats();
  const { refetch: refetchWallet } = useWallet();
  const { writeContractAsync } = useWriteContract();
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  if (!DEPLOYED || !isConnected || positions.length === 0) return null;

  async function act(kind: "claim" | "withdraw", id: number) {
    setBusy(`${kind}-${id}`);
    try {
      const hash = await writeContractAsync({
        address: STAKING,
        abi: STAKING_ABI,
        functionName: kind === "claim" ? "claimReward" : "withdrawPrincipal",
        args: [BigInt(id)],
      });
      await waitForTransactionReceipt(config, { hash });
      refetch();
      refetchWallet();
    } catch {
      /* 用户取消或失败:状态自动回滚,不打断页面 */
    } finally {
      setBusy(null);
    }
  }

  const live = positions.filter((p) => !p.withdrawn);
  const done = positions.filter((p) => p.withdrawn);

  return (
    <section id="mine" style={{ marginTop: 34 }}>
      <div className="eb">
        <i />
        我的签约
      </div>
      <h2>雪球正在滚动</h2>
      <p className="sub">奖励逐日累积、随时可领;本金到期后原数取回。</p>

      <div className="pos">
        {[...live, ...done].map((p) => (
          <Row key={p.id} p={p} now={now} busy={busy} reserve={rewardReserve} onAct={act} />
        ))}
      </div>
    </section>
  );
}

function Row({
  p,
  now,
  busy,
  reserve,
  onAct,
}: {
  p: Position;
  now: number;
  busy: string | null;
  reserve: bigint;
  onAct: (k: "claim" | "withdraw", id: number) => void;
}) {
  const end = Number(p.endTime);
  const matured = now > 0 && now >= end;
  const claimBusy = busy === `claim-${p.id}`;
  const wdBusy = busy === `withdraw-${p.id}`;
  // 奖励池余额 < 待领:此时领取(或取回本金时的自动结算)只发得出池里剩的,差额会被合约视为已结、
  // 不再补发。为保护用户,池不足时禁用"领取",并明确提示等注资。
  const shortfall = !p.withdrawn && p.pending > 0n && p.pending > reserve;

  return (
    <div className="prow">
      <span className="term">{String(p.termDays)} 天</span>

      <div className="kv">
        <div className="k">本金</div>
        <div className="v">{fmt(toNum(p.principal), 2)} SNOWBALL</div>
      </div>

      <div className="kv">
        <div className="k">待领奖励</div>
        <div className="v good">{fmt(toNum(p.pending), 4)}</div>
      </div>

      <div className="kv">
        <div className="k">{p.withdrawn ? "状态" : "本金返还"}</div>
        <div className="v">{p.withdrawn ? "已结束" : now === 0 ? "…" : countdown(end, now)}</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="mini-btn"
          disabled={p.pending === 0n || claimBusy || shortfall}
          onClick={() => onAct("claim", p.id)}
        >
          {claimBusy ? "领取中…" : "领取奖励"}
        </button>
        {!p.withdrawn && (
          <button
            className="mini-btn ghost"
            disabled={!matured || wdBusy}
            onClick={() => onAct("withdraw", p.id)}
          >
            {wdBusy ? "取回中…" : "取回本金"}
          </button>
        )}
      </div>

      {shortfall && (
        <div className="note warn" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
          奖励池余额不足(剩 {fmt(toNum(reserve), 2)}):现在领取只能拿到池内剩余、差额不再补发;取回本金也会按当前池余额结算奖励。建议等社区补充注资后再操作(本金不受影响)。
        </div>
      )}
    </div>
  );
}
