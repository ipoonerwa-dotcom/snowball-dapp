"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { BUY_ROUTER_ABI } from "@/lib/abis";
import { BUY_ROUTER, CHAIN_ID, REFERRAL_ENABLED } from "@/lib/config";
import { shortAddr } from "@/lib/format";
import { useReferral, useUrlRef } from "@/lib/useReferral";

/**
 * 进入邀请链接(?ref=0x…)+ 连钱包 → 自动弹一笔 bindReferrer 把关系上链锁定(买之前就绑好)。
 * 先绑先赢、永久锁定;用户若拒签,保留手动"绑定"按钮,首次买入时合约也会兜底绑定。
 */
export default function BindReferrerGate() {
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const urlRef = useUrlRef();
  const { bound, referrer, refetch } = useReferral();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<"idle" | "signing" | "done" | "rejected">("idle");
  const firedFor = useRef<string>("");

  const eligible =
    REFERRAL_ENABLED && isConnected && chainId === CHAIN_ID && !!urlRef && !bound && !!address;

  async function bind() {
    if (!urlRef) return;
    setStatus("signing");
    try {
      const hash = await writeContractAsync({
        address: BUY_ROUTER,
        abi: BUY_ROUTER_ABI,
        functionName: "bindReferrer",
        args: [urlRef],
      });
      await waitForTransactionReceipt(config, { hash });
      setStatus("done");
      refetch();
    } catch {
      setStatus("rejected");
    }
  }

  // 自动触发一次(每个 address+ref 组合只弹一次,避免反复打扰)
  useEffect(() => {
    if (!eligible) return;
    const key = `${address}-${urlRef}`;
    if (firedFor.current === key) return;
    firedFor.current = key;
    bind();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, address, urlRef]);

  if (!REFERRAL_ENABLED) return null;

  // 已绑定 → 轻提示(仅当带着 ref 进来时才显示,避免噪音)
  if (bound && urlRef) {
    return (
      <div className="banner" style={{ borderColor: "rgba(94,234,212,.28)", background: "rgba(94,234,212,.06)", color: "var(--teal)" }}>
        ✓ 已绑定邀请人 <code style={{ fontFamily: "var(--mono)" }}>{shortAddr(referrer)}</code>
      </div>
    );
  }

  if (!urlRef || !isConnected) return null;
  if (chainId !== CHAIN_ID) return null;

  return (
    <div className="banner" style={{ borderColor: "var(--line2)", background: "rgba(56,189,248,.06)", color: "var(--snow)" }}>
      <span>
        你被 <code style={{ fontFamily: "var(--mono)", color: "var(--cyan)" }}>{shortAddr(urlRef)}</code> 邀请 ——{" "}
        {status === "signing"
          ? "请在钱包确认绑定…"
          : status === "done"
            ? "已绑定 ✓"
            : status === "rejected"
              ? "绑定被取消。"
              : "正在绑定邀请关系…"}
      </span>
      {(status === "rejected" || status === "idle") && (
        <button
          className="mini-btn"
          style={{ marginLeft: "auto" }}
          onClick={bind}
        >
          绑定邀请人
        </button>
      )}
    </div>
  );
}
