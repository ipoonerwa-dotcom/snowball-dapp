"use client";

import { useMemo, useState } from "react";
import { formatUnits, maxUint256, parseUnits } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { ERC20_ABI, STAKING_ABI } from "@/lib/abis";
import { CHAIN_ID, DEPLOYED, STAKING, TERMS, TOKEN } from "@/lib/config";
import { fmt, fmtUsd, toNum } from "@/lib/format";
import { useGlobalStats, usePositions, usePrice, useWallet } from "@/lib/useSnowball";

const BARS_30 = [24, 33, 41, 50, 60, 72, 85, 97];
const BARS_60 = [16, 26, 36, 46, 58, 72, 86, 100];

function errText(e: unknown): string {
  const m = (e as { shortMessage?: string; message?: string })?.shortMessage ||
    (e as { message?: string })?.message || "交易失败";
  if (/User rejected|User denied|rejected the request/i.test(m)) return "已取消";
  return m.length > 90 ? m.slice(0, 90) + "…" : m;
}

export default function SignSection() {
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const { price } = usePrice();
  const { stakingOpen, rewardReserve } = useGlobalStats();
  const { balance, allowance, refetch: refetchWallet } = useWallet();
  const { refetch: refetchPositions } = usePositions();
  const { writeContractAsync } = useWriteContract();

  const [term, setTerm] = useState<number>(60);
  const [amount, setAmount] = useState<string>("");
  const [busy, setBusy] = useState<"approve" | "stake" | null>(null);
  const [msg, setMsg] = useState<string>("");

  const amountWei = useMemo(() => {
    try {
      return parseUnits((amount || "0").replace(/,/g, ""), 18);
    } catch {
      return 0n;
    }
  }, [amount]);

  const rateBps = TERMS.find((t) => t.days === term)?.rateBps ?? 2500;
  const p = toNum(price);
  const amtNum = toNum(amountWei);
  const stakeUsd = amtNum * p;
  const rewardUsd = (stakeUsd * rateBps) / 10000;

  const wrongChain = isConnected && chainId !== CHAIN_ID;
  const needsApprove = amountWei > 0n && allowance < amountWei;
  const overBalance = amountWei > balance;
  const canAct = DEPLOYED && isConnected && !wrongChain && stakingOpen && amountWei > 0n && !overBalance;

  async function run(kind: "approve" | "stake") {
    setBusy(kind);
    setMsg("");
    try {
      const hash =
        kind === "approve"
          ? await writeContractAsync({
              address: TOKEN,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [STAKING, maxUint256],
            })
          : await writeContractAsync({
              address: STAKING,
              abi: STAKING_ABI,
              functionName: "stake",
              args: [amountWei, BigInt(term)],
            });
      await waitForTransactionReceipt(config, { hash });
      refetchWallet();
      refetchPositions();
      if (kind === "approve") setMsg("授权完成,可以签约了");
      else {
        setMsg(`签约成功:${fmt(amtNum, 2)} SNOWBALL · ${term} 天`);
        setAmount("");
      }
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(null);
    }
  }

  const btnLabel = !DEPLOYED
    ? "合约待部署"
    : !isConnected
      ? "请先连接钱包"
      : wrongChain
        ? "请切换到 BSC"
        : !stakingOpen
          ? "签约已暂停"
          : overBalance
            ? "余额不足"
            : busy === "approve"
              ? "授权中…"
              : busy === "stake"
                ? "签约中…"
                : needsApprove
                  ? "授权 SNOWBALL"
                  : "立即签约";

  return (
    <section id="sign">
      <div className="eb">
        <i />
        签约计划 · Contract
      </div>
      <h2>选一条山坡,开始滚动</h2>
      <p className="sub">签得越久,雪球越大。本金币本位到期原数返,奖励金本位每日累积。</p>

      <div className="stk">
        {TERMS.map((t) => {
          const bars = t.days === 30 ? BARS_30 : BARS_60;
          return (
            <div
              key={t.days}
              className={`cd click ${t.peak ? "pk" : ""} ${term === t.days ? "sel" : ""}`}
              onClick={() => setTerm(t.days)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setTerm(t.days)}
            >
              <div className="tm">
                <span className="d">{t.label}</span>
                {t.peak && <span className="pill mt0">更划算</span>}
              </div>
              <div className="apy">
                +{t.rateBps / 100}
                <small>%</small>
              </div>
              <span className="pill">USD 价值 × {t.rateBps / 100}%</span>
              <div className="mini">
                {bars.map((h, i) => (
                  <i key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="rl">
                <span>每日释放</span>
                <b>≈{(t.rateBps / 100 / t.days).toFixed(2)}%</b>
              </div>
              <div className="rl">
                <span>本金返还</span>
                <b>第 {t.days} 天</b>
              </div>
            </div>
          );
        })}

        <div className="cd">
          <div className="tm">
            <span className="d">签约 · {term} 天</span>
            <span className="d" style={{ fontSize: 12 }}>
              余额 {fmt(toNum(balance), 2)}
            </span>
          </div>

          <div className="fld">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              min="0"
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="t">SNOWBALL</span>
            <span className="max" onClick={() => setAmount(formatUnits(balance, 18))}>
              MAX
            </span>
          </div>

          <div className="acc">
            <div className="l">预计奖励(金本位)</div>
            <div className="b">
              {p ? fmtUsd(rewardUsd) : "—"} <span>{p ? `≈ 每日 ${fmtUsd(rewardUsd / term)}` : ""}</span>
            </div>
          </div>

          <button
            className="btn bc"
            style={{ width: "100%" }}
            disabled={!canAct || busy !== null}
            onClick={() => run(needsApprove ? "approve" : "stake")}
          >
            {btnLabel}
          </button>

          <div className="note">
            签约金额按当前价折成 USD 锁定奖励额度({stakeUsd ? fmtUsd(stakeUsd) : "—"});
            每晚 12:00 按 5 分钟均价折算入账,逐日累积随时可领;本金到期原数返还。
          </div>
          {DEPLOYED && stakingOpen && rewardReserve === 0n && (
            <div className="note warn">
              提示:奖励池尚未注资。签约后奖励照常累积不丢失,但请等注资后再点"领取"(注资前领取拿不到、且该次差额不补发);本金随时按期返还,不受影响。
            </div>
          )}
          {msg && <div className={`note ${/成功|完成/.test(msg) ? "" : "warn"}`}>{msg}</div>}
        </div>
      </div>
    </section>
  );
}
