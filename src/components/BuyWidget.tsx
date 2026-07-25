"use client";

import { useMemo, useState } from "react";
import { formatEther, maxUint256, parseEther } from "viem";
import { useAccount, useBalance, useConfig, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { BUY_ROUTER_ABI, ERC20_ABI, PANCAKE_ABI } from "@/lib/abis";
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

type Mode = "buy" | "sell";

export default function BuyWidget() {
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const { data: bnb } = useBalance({ address, chainId: CHAIN_ID, query: { enabled: !!address } });
  const { livePrice } = usePrice();
  const { buyOpen, refetch } = useReferral();
  const urlRef = useUrlRef();
  const { writeContractAsync } = useWriteContract();

  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // 我的 SNOWBALL 余额 + 对 Pancake 的授权额度(卖出用)
  const { data: tokenData, refetch: refetchToken } = useReadContracts({
    contracts: [
      { address: TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [address ?? ZERO], chainId: CHAIN_ID },
      { address: TOKEN, abi: ERC20_ABI, functionName: "allowance", args: [address ?? ZERO, PANCAKE_ROUTER], chainId: CHAIN_ID },
    ],
    query: { enabled: !!address, refetchInterval: 20_000 },
  });
  const snowBal = (tokenData?.[0]?.result as bigint | undefined) ?? 0n;
  const pancakeAllowance = (tokenData?.[1]?.result as bigint | undefined) ?? 0n;

  const amountWei = useMemo(() => {
    try {
      return amount.trim() ? parseEther(amount.trim()) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);

  // Pancake 报价:买入 path=[WBNB,TOKEN] 出 SNOWBALL;卖出 path=[TOKEN,WBNB] 出 BNB
  const path = mode === "buy" ? [WBNB, TOKEN] : [TOKEN, WBNB];
  const { data: quote } = useReadContract({
    address: PANCAKE_ROUTER,
    abi: PANCAKE_ABI,
    functionName: "getAmountsOut",
    args: [amountWei, path],
    chainId: CHAIN_ID,
    query: { enabled: REFERRAL_ENABLED && amountWei > 0n },
  });
  const estOut = ((quote as bigint[] | undefined)?.[1]) ?? 0n;
  const minOut = (estOut * (10000n - SLIPPAGE_BPS)) / 10000n;

  const wrongChain = isConnected && chainId !== CHAIN_ID;
  const p = toNum(livePrice);

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setAmount("");
    setMsg("");
  }

  // ── buy ──
  const overBnb = !!bnb && amountWei > bnb.value;
  const canBuy = REFERRAL_ENABLED && isConnected && !wrongChain && buyOpen && amountWei > 0n && !overBnb;

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
      refetchToken();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  }

  // ── sell(SNOWBALL -> BNB,直连 Pancake,无邀请归因)──
  const overSnow = amountWei > snowBal;
  const needsApprove = amountWei > 0n && pancakeAllowance < amountWei;
  const canSell = REFERRAL_ENABLED && isConnected && !wrongChain && amountWei > 0n && !overSnow;

  async function sell() {
    setBusy(true);
    setMsg("");
    try {
      if (needsApprove) {
        const ah = await writeContractAsync({
          address: TOKEN,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [PANCAKE_ROUTER, maxUint256],
        });
        await waitForTransactionReceipt(config, { hash: ah });
        refetchToken();
      }
      const hash = await writeContractAsync({
        address: PANCAKE_ROUTER,
        abi: PANCAKE_ABI,
        functionName: "swapExactTokensForETHSupportingFeeOnTransferTokens",
        args: [amountWei, minOut, [TOKEN, WBNB], address ?? ZERO, BigInt(Math.floor(Date.now() / 1000) + 600)],
      });
      await waitForTransactionReceipt(config, { hash });
      setMsg(`卖出成功 ✓ 约 ${fmt(toNum(estOut), 5)} BNB`);
      setAmount("");
      refetchToken();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  }

  const estUsdBuy = toNum(estOut) * p; // 买入到手 SNOWBALL 的 USD

  const buyLabel = !REFERRAL_ENABLED
    ? "买入待部署"
    : !isConnected
      ? "请先连接钱包"
      : wrongChain
        ? "请切换到 BSC"
        : !buyOpen
          ? "买入已暂停"
          : overBnb
            ? "BNB 余额不足"
            : busy
              ? "买入中…"
              : "买入 SNOWBALL";

  const sellLabel = !REFERRAL_ENABLED
    ? "卖出待部署"
    : !isConnected
      ? "请先连接钱包"
      : wrongChain
        ? "请切换到 BSC"
        : overSnow
          ? "SNOWBALL 余额不足"
          : busy
            ? needsApprove ? "授权中…" : "卖出中…"
            : needsApprove
              ? "授权 SNOWBALL"
              : "卖出 SNOWBALL";

  return (
    <div className="cd">
      <div className="modetabs">
        <button className={mode === "buy" ? "on" : ""} onClick={() => switchMode("buy")}>买入</button>
        <button className={mode === "sell" ? "on" : ""} onClick={() => switchMode("sell")}>卖出</button>
      </div>

      {mode === "buy" ? (
        <>
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
              {estOut > 0n ? fmt(toNum(estOut), 2) : "—"} <span>SNOWBALL {estUsdBuy ? `≈ ${fmtUsd(estUsdBuy)}` : ""}</span>
            </div>
          </div>

          <button className="btn bc" style={{ width: "100%" }} disabled={!canBuy || busy} onClick={buy}>
            {buyLabel}
          </button>
          <div className="note">
            通过本 DApp 买入才计入邀请归因(TP/直接买不算)。到手数含 SNOWBALL 转账税,已预留 12% 滑点容忍。
            {urlRef ? " 本次买入将绑定/沿用你的邀请人。" : ""}
          </div>
        </>
      ) : (
        <>
          <div className="tm">
            <span className="d">卖出 SNOWBALL 换 BNB</span>
            <span className="d" style={{ fontSize: 12 }}>余额 {fmt(toNum(snowBal), 2)} SNOWBALL</span>
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
            <span className="t">SNOWBALL</span>
            <span className="max" onClick={() => setAmount(formatEther(snowBal))}>MAX</span>
          </div>

          <div className="acc">
            <div className="l">预计到手(税前估算)</div>
            <div className="b">
              {estOut > 0n ? fmt(toNum(estOut), 5) : "—"} <span>BNB</span>
            </div>
          </div>

          <button className="btn bc" style={{ width: "100%" }} disabled={!canSell || busy} onClick={sell}>
            {sellLabel}
          </button>
          <div className="note">
            卖出直连 PancakeSwap(与邀请返佣无关)。到手 BNB 已扣 SNOWBALL 转账税,预留 12% 滑点容忍;首次卖出需先授权一次。
          </div>
        </>
      )}
      {msg && <div className={`note ${/成功/.test(msg) ? "" : "warn"}`}>{msg}</div>}
    </div>
  );
}
