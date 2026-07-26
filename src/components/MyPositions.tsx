"use client";

import { useEffect, useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { STAKING_ABI } from "@/lib/abis";
import { DEPLOYED, STAKING } from "@/lib/config";
import { countdown, fmt, toNum } from "@/lib/format";
import { useGlobalStats, usePositions, useTotalPending, useWallet, type Position } from "@/lib/useSnowball";

export default function MyPositions() {
  const config = useConfig();
  const { isConnected } = useAccount();
  const { positions, refetch } = usePositions();
  const { rewardReserve } = useGlobalStats();
  const { totalPending, ready: totalReady } = useTotalPending();
  const { refetch: refetchWallet } = useWallet();
  const { writeContractAsync } = useWriteContract();
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // 只要连了钱包就显示本板块(哪怕还没签约),让"领取/取回"入口始终可被发现;
  // 没签约时给一句引导,避免用户以为"没有领取按钮"。
  if (!DEPLOYED || !isConnected) return null;

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

  // 池子必须盖得住【全体待领】才放行领取:合约先到先得、发完即止,
  // 池子不足时谁先点谁拿满、后点的被截断且差额永久作废。数据没读齐时按不足处理(保守)。
  const poolCovers = totalReady && rewardReserve >= totalPending;
  const anyPending = live.some((p) => p.pending > 0n);

  return (
    <section id="mine" style={{ marginTop: 34 }}>
      <div className="eb">
        <i />
        我的签约
      </div>
      <h2>雪球正在滚动</h2>
      <p className="sub">奖励逐日累积、随时可领;本金到期后原数取回。</p>

      {/* 奖励池覆盖状态:必须盖住全体待领才允许领取 */}
      {positions.length > 0 && (
        <div className={`poolbar ${poolCovers ? "ok" : "short"}`}>
          <span>
            奖励池 <b>{fmt(toNum(rewardReserve), 2)}</b> SNOWBALL
            {totalReady && <> · 全体待领 <b>{fmt(toNum(totalPending), 2)}</b></>}
          </span>
          <span className="tag">
            {!totalReady ? "核对中…" : poolCovers ? "✓ 池子充足,可正常领取" : "⚠ 池子不足,领取已暂停"}
          </span>
        </div>
      )}
      {totalReady && !poolCovers && anyPending && (
        <div className="note warn">
          <b>领取已暂停</b>:奖励池({fmt(toNum(rewardReserve), 2)})不足以覆盖全体待领
          ({fmt(toNum(totalPending), 2)})。合约是先到先得、发完即止 —— 此时领取,先点的人拿满、
          后点的人只能拿到池内剩余,<b>差额将永久作废且无法补发</b>。
          为保护所有人,领取按钮暂时禁用,等社区补充奖励池后自动恢复。
          <br />
          <b>你的奖励不会丢失</b>:继续按天累积,补币后照常全额领取。</div>
      )}

      {positions.length === 0 ? (
        <div className="prow">
          <div className="note" style={{ gridColumn: "1 / -1", margin: 0 }}>
            你还没有签约。在上方「签约计划」选择期限并签约后,你的仓位会显示在这里,可随时
            <b>领取每日奖励</b>、到期<b>取回本金</b>。
          </div>
        </div>
      ) : (
        <div className="pos">
          {[...live, ...done].map((p) => (
            <Row key={p.id} p={p} now={now} busy={busy} poolCovers={poolCovers} onAct={act} />
          ))}
        </div>
      )}
    </section>
  );
}

function Row({
  p,
  now,
  busy,
  poolCovers,
  onAct,
}: {
  p: Position;
  now: number;
  busy: string | null;
  poolCovers: boolean;
  onAct: (k: "claim" | "withdraw", id: number) => void;
}) {
  const end = Number(p.endTime);
  const matured = now > 0 && now >= end;
  const claimBusy = busy === `claim-${p.id}`;
  const wdBusy = busy === `withdraw-${p.id}`;
  // 池子必须盖得住【全体待领】才放行:合约先到先得、发完即止,池子不足时后领的人差额永久作废。
  const blocked = !p.withdrawn && p.pending > 0n && !poolCovers;

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
          disabled={p.pending === 0n || claimBusy || blocked}
          title={blocked ? "奖励池不足以覆盖全体待领,领取已暂停" : undefined}
          onClick={() => onAct("claim", p.id)}
        >
          {claimBusy ? "领取中…" : blocked ? "待社区补币" : "领取奖励"}
        </button>
        {!p.withdrawn && (
          <button
            className="mini-btn ghost"
            disabled={!matured || wdBusy}
            title={blocked && matured ? "注意:取回本金会同时结算奖励,池子不足的部分将作废" : undefined}
            onClick={() => onAct("withdraw", p.id)}
          >
            {wdBusy ? "取回中…" : "取回本金"}
          </button>
        )}
      </div>

      {blocked && matured && (
        <div className="note warn" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
          ⚠ 本金已到期可取,但<b>取回本金会同时结算奖励</b> —— 当前奖励池不足,这部分差额会永久作废。
          建议等社区补币后再取(本金不会因为晚取而减少)。
        </div>
      )}
    </div>
  );
}
