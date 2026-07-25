"use client";

import { useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useConfig, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { BUY_ROUTER_ABI, PANCAKE_ABI } from "@/lib/abis";
import { BUY_ROUTER, CHAIN_ID, PANCAKE_ROUTER, REFERRAL_ENABLED, TOKEN, WBNB, ZERO } from "@/lib/config";
import { fmt, fmtUsd, toNum } from "@/lib/format";
import { usePrice } from "@/lib/useSnowball";
import { useReferral, useUrlRef } from "@/lib/useReferral";

const SLIPPAGE_BPS = 1200n; // 12% — 需覆盖 SNOWBALL 转账税 + 价格波动

function errText(e: unknown): string {
  const m =
    (e as { shortMessage?: string })?.shortMessage || (e as { message?: string })?.message || "交易失败";
  if (/User rejected|denied|rejected the request/i.test(m)) return "已取消";
  return m.length > 90 ? m.slice(0, 90) + "…" : m;
}

export default function BuyWidget() {
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const { data: bnb } = useBalance({ address, chainId: CHAIN_ID, query: { enabled: !!address } });
  const { livePrice } = usePrice();
  const { buyOpen, refetch } = useReferral();
  const urlRef = useUrlRef();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const amountWei = useMemo(() => {
    try {
      return amount.trim() ? parseEther(amount.trim()) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);

  // Pancake 报价(税前):amounts[1] = 预计 SNOWBALL
  const { data: quote } = useReadContract({
    address: PANCAKE_ROUTER,
    abi: PANCAKE_ABI,
    functionName: "getAmountsOut",
    args: [amountWei, [WBNB, TOKEN]],
    chainId: CHAIN_ID,
    query: { enabled: REFERRAL_ENABLED && amountWei > 0n },
  });
  const estOut = ((quote as bigint[] | undefined)?.[1]) ?? 0n;
  const minOut = (estOut * (10000n - SLIPPAGE_BPS)) / 10000n;

  const wrongChain = isConnected && chainId !== CHAIN_ID;
  const overBal = !!bnb && amountWei > bnb.value;
  const canBuy = REFERRAL_ENABLED && isConnected && !wrongChain && buyOpen && amountWei > 0n && !overBal;

  async function buy() {
    setBusy(true);
    setMsg("");
    try {
      const hash = await writeContractAsync({
        address: BUY_ROUTER,
        abi: BUY_ROUTER_ABI,
        functionName: "buy",
        args: [urlRef ?? ZERO, minOut], // 未绑定则用链接的邀请人绑定;已绑定合约会忽略
        value: amountWei,
      });
      await waitForTransactionReceipt(config, { hash });
      setMsg(`买入成功 ✓ 约 ${fmt(toNum(estOut), 2)} SNOWBALL`);
      setAmount("");
      refetch();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  }

  const p = toNum(livePrice);
  const estUsd = toNum(estOut) * p;

  const label = !REFERRAL_ENABLED
    ? "买入待部署"
    : !isConnected
      ? "请先连接钱包"
      : wrongChain
        ? "请切换到 BSC"
        : !buyOpen
          ? "买入已暂停"
          : overBal
            ? "BNB 余额不足"
            : busy
              ? "买入中…"
              : "买入 SNOWBALL";

  return (
    <div className="cd">
      <div className="tm">
        <span className="d">用 BNB 买入 SNOWBALL</span>
        <span className="d" style={{ fontSize: 12 }}>余额 {bnb ? fmt(Number(formatEther(bnb.value)), 4) : "0"} BNB</span>
      </div>

      <div className="fld">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.0"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="t">BNB</span>
        {bnb && (
          <span
            className="max"
            onClick={() => setAmount(formatEther(bnb.value > 2_000_000_000_000_000n ? bnb.value - 2_000_000_000_000_000n : 0n))}
          >
            MAX
          </span>
        )}
      </div>

      <div className="acc">
        <div className="l">预计到手(税前估算)</div>
        <div className="b">
          {estOut > 0n ? fmt(toNum(estOut), 2) : "—"} <span>SNOWBALL {estUsd ? `≈ ${fmtUsd(estUsd)}` : ""}</span>
        </div>
      </div>

      <button className="btn bc" style={{ width: "100%" }} disabled={!canBuy || busy} onClick={buy}>
        {label}
      </button>
      <div className="note">
        通过本 DApp 买入才计入邀请归因(TP/直接买不算)。到手数含 SNOWBALL 转账税,已预留 12% 滑点容忍。
        {urlRef ? " 本次买入将绑定/沿用你的邀请人。" : ""}
      </div>
      {msg && <div className={`note ${/成功/.test(msg) ? "" : "warn"}`}>{msg}</div>}
    </div>
  );
}
