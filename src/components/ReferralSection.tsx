"use client";

import { useEffect, useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { NetworkOrb } from "./Art";
import { BUY_ROUTER_ABI } from "@/lib/abis";
import { BUY_ROUTER, REFERRAL_ENABLED, TIERS } from "@/lib/config";
import { fmt, fmtUsd, toNum } from "@/lib/format";
import { useReferral } from "@/lib/useReferral";

export default function ReferralSection() {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const ref = useReferral();
  const { writeContractAsync } = useWriteContract();

  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (address) setInviteLink(`${window.location.origin}/?ref=${address}`);
  }, [address]);

  function copy() {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function claim() {
    setClaiming(true);
    setMsg("");
    try {
      const hash = await writeContractAsync({ address: BUY_ROUTER, abi: BUY_ROUTER_ABI, functionName: "claimCommission" });
      await waitForTransactionReceipt(config, { hash });
      setMsg("已领取 ✓");
      ref.refetch();
    } catch (e) {
      const m = (e as { shortMessage?: string })?.shortMessage || "领取失败";
      setMsg(/rejected|denied/i.test(m) ? "已取消" : m.length > 60 ? "领取失败" : m);
    } finally {
      setClaiming(false);
    }
  }

  const tier = TIERS[Math.min(ref.rank, 5)];
  const dash = "—";

  return (
    <section id="invite" className="comm">
      <div className="grid">
        <div>
          <div className="emblem-box">
            <NetworkOrb size={116} />
          </div>
          <h2>把雪球滚给更多人</h2>
          <p>
            把你的专属邀请链接发给好友,他们<b>打开链接进 DApp</b> 就自动绑定成你的下线;之后他们通过 DApp
            买入 SNOWBALL,你按团队等级实时拿 <b>5%–10%</b> 返佣(社区池发放,随时可领)。团队 U 业绩越高,等级越高,分成越多。
          </p>

          {/* 邀请链接 */}
          {REFERRAL_ENABLED && isConnected && (
            <div className="fld" style={{ marginTop: 14 }}>
              <input readOnly value={inviteLink} style={{ fontSize: 12.5 }} />
              <span className="max" onClick={copy}>{copied ? "已复制" : "复制"}</span>
            </div>
          )}

          {/* 等级阶梯 */}
          <div className="tiers">
            {TIERS.map((t, i) => (
              <span className="ti" key={t.name} style={ref.rank === i && isConnected ? { borderColor: "var(--teal)", background: "rgba(94,234,212,.16)" } : undefined}>
                {t.name} <b>{t.rate}%</b>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="iv">
            <div className="ic">
              <div className="k">我的等级</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? `${tier.name} · ${tier.rate}%` : dash}</div>
            </div>
            <div className="ic">
              <div className="k">团队业绩</div>
              <div className="v">{ref.teamUsd != null ? fmtUsd(ref.teamUsd) : dash}</div>
            </div>
          </div>
          <div className="iv">
            <div className="ic">
              <div className="k">累计返佣</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? fmt(toNum(ref.claimed) + toNum(ref.owed), 2) : dash}</div>
            </div>
            <div className="ic">
              <div className="k">直推人数</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? ref.directCount : dash}</div>
            </div>
          </div>

          {/* 可领返佣 + 领取 */}
          <div className="acc" style={{ marginTop: 12, marginBottom: 12 }}>
            <div className="l">可领返佣</div>
            <div className="b">
              {REFERRAL_ENABLED && isConnected ? fmt(toNum(ref.claimable), 4) : dash} <span>SNOWBALL</span>
            </div>
          </div>
          <button
            className="btn bc"
            style={{ width: "100%" }}
            disabled={!REFERRAL_ENABLED || !isConnected || ref.claimable === 0n || claiming}
            onClick={claim}
          >
            {!REFERRAL_ENABLED ? "邀请待部署" : claiming ? "领取中…" : "领取返佣"}
          </button>
          {ref.owed > ref.claimable && ref.owed > 0n && (
            <div className="note warn">
              还有 {fmt(toNum(ref.owed - ref.claimable), 4)} 待发(邀请池余额不足,社区补币后可领,不会作废)。
            </div>
          )}
          {msg && <div className={`note ${/✓/.test(msg) ? "" : "warn"}`}>{msg}</div>}
        </div>
      </div>
    </section>
  );
}
