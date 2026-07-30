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
  const { rewardReserve, dayIdx } = useGlobalStats();
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

  // 两道闸,任一不满足就禁用领取(合约先到先得、发完即止,差额永久作废):
  //   闸1 我这一单 > 池子       —— 精确、始终有效
  //   闸2 全体待领 > 池子       —— 防多人抢领;名单来自买入合约,可能少算,
  //                                所以只作为【额外】一道,数据没读齐时不参与判断,
  //                                避免 RPC 抖动误伤用户。
  const totalShort = totalReady && totalPending > rewardReserve;
  const anyPending = live.some((p) => p.pending > 0n);

  return (
    <section id="mine" style={{ marginTop: 34 }}>
      <div className="eb">
        <i />
        我的签约
      </div>
      <h2>雪球正在滚动</h2>
      <p className="sub">奖励逐日累积、随时可领;本金到期后原数取回。</p>

      {/* 奖励池状态 */}
      {positions.length > 0 && (
        <div className={`poolbar ${totalShort ? "short" : "ok"}`}>
          <span>
            奖励池 <b>{fmt(toNum(rewardReserve), 2)}</b> SNOWBALL
            {totalReady && <> · 全体待领 <b>{fmt(toNum(totalPending), 2)}</b></>}
          </span>
          <span className="tag">
            {!totalReady ? "核对中…" : totalShort ? "⚠ 池子不足,领取已暂停" : "✓ 池子充足,可正常领取"}
          </span>
        </div>
      )}
      {totalShort && anyPending && (
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
            <Row key={p.id} p={p} now={now} busy={busy} reserve={rewardReserve}
              dayIdx={dayIdx} totalShort={totalShort} onAct={act} />
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
  reserve,
  dayIdx,
  totalShort,
  onAct,
}: {
  p: Position;
  now: number;
  busy: string | null;
  reserve: bigint;
  dayIdx: bigint;
  totalShort: boolean;
  onAct: (k: "claim" | "withdraw", id: number) => void;
}) {
  const end = Number(p.endTime);
  const matured = now > 0 && now >= end;

  // ── 按 U 计价的收益明细(社区要的「质押了多少 U / 每天分多少 / 已领 / 还剩」)──
  //
  // 全部按【美元】口径算,而不是按代币:合约本来就是金本位的 —— 入场时把这一单的
  // 美元奖励预算 rewardUsdPerDay 锁死,之后每天按当日 TWAP 折成币发。所以「已领多少」
  // 用美元表述才是稳定的,用代币表述每天都在变、对不上账。
  //
  // 三段相加恒等于总奖励:已领 + 已结算待领 + 未到期 = rewardUsdPerDay × termDays。
  // 用「第几格」而不是「第几天」来切,因为合约的上限就是格数(endIdx = 入场格 + 期限天数),
  // keeper 漏跑一天只是格子往后顺延,不会少发。
  const rateBps = p.termDays === 60n ? 2500n : 1000n; // 30天 +10% / 60天 +25%
  const totalUsd = p.rewardUsdPerDay * p.termDays;
  const stakeUsd = rateBps > 0n ? (totalUsd * 10000n) / rateBps : 0n; // 入场价锁定的本金 U 值
  const endIdx = p.startDayIdx + p.termDays;
  const settledIdx = dayIdx > endIdx ? endIdx : dayIdx;               // 已结算到哪一格(封顶)
  const claimedUsd = p.rewardUsdPerDay * (p.claimedThruIdx > p.startDayIdx ? p.claimedThruIdx - p.startDayIdx : 0n);
  const pendingUsd = p.rewardUsdPerDay * (settledIdx > p.claimedThruIdx ? settledIdx - p.claimedThruIdx : 0n);
  const futureUsd = p.rewardUsdPerDay * (endIdx > settledIdx ? endIdx - settledIdx : 0n);
  const claimBusy = busy === `claim-${p.id}`;
  const wdBusy = busy === `withdraw-${p.id}`;
  // 闸1(精确):我这一单就超过池子 —— 无论名单是否完整都成立
  const myShort = !p.withdrawn && p.pending > 0n && p.pending > reserve;
  // 闸2(额外):全体待领超过池子 —— 防多人抢领
  const blocked = !p.withdrawn && p.pending > 0n && (myShort || totalShort);

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

      {/* U 口径明细:整行跨列铺开,窄屏自动换行 —— 不去挤上面那行的列宽 */}
      <div className="udetail">
        <span><i>质押</i>${fmt(toNum(stakeUsd), 2)}</span>
        <span><i>每日</i>${fmt(toNum(p.rewardUsdPerDay), 4)}</span>
        <span><i>已领</i>${fmt(toNum(claimedUsd), 4)}</span>
        <span className="hi"><i>待领</i>${fmt(toNum(pendingUsd), 4)}</span>
        <span><i>未到期</i>${fmt(toNum(futureUsd), 4)}</span>
        <span className="tot"><i>奖励合计</i>${fmt(toNum(totalUsd), 2)}</span>
      </div>

      {myShort && (
        <div className="note warn" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
          你这一单待领({fmt(toNum(p.pending), 4)})已超过奖励池余额({fmt(toNum(reserve), 2)}),
          现在领取只能拿到池内剩余、<b>差额永久作废</b>。等社区补币后再领,一分不少。
        </div>
      )}
      {blocked && matured && (
        <div className="note warn" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
          ⚠ 本金已到期可取,但<b>取回本金会同时结算奖励</b> —— 当前奖励池不足,这部分差额会永久作废。
          建议等社区补币后再取(本金不会因为晚取而减少)。
        </div>
      )}
    </div>
  );
}
