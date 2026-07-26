"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { NetworkOrb } from "./Art";
import { copyText } from "@/lib/clipboard";
import { REFERRAL_ENABLED, TIERS } from "@/lib/config";
import { fmtUsd } from "@/lib/format";
import { useReferral } from "@/lib/useReferral";

export default function ReferralSection() {
  const { address, isConnected } = useAccount();
  const ref = useReferral();

  const [inviteLink, setInviteLink] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "ok" | "manual">("idle");
  const [canShare, setCanShare] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (address) setInviteLink(`${window.location.origin}/?ref=${address}`);
  }, [address]);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function share() {
    if (!inviteLink) return;
    try {
      await navigator.share({ title: "SNOWBALL 签约", text: "一起签约 SNOWBALL,雪球越滚越大 ❄️", url: inviteLink });
    } catch {
      /* 用户取消或不支持:回退到复制 */
      copy();
    }
  }

  async function copy() {
    if (!inviteLink) return;
    const ok = await copyText(inviteLink);
    if (ok) {
      setCopyState("ok");
      setTimeout(() => setCopyState("idle"), 1500);
    } else {
      // 钱包 WebView 禁了剪贴板:选中链接,提示用户长按复制
      const el = linkInputRef.current;
      if (el) {
        el.focus();
        el.select();
        el.setSelectionRange(0, inviteLink.length);
      }
      setCopyState("manual");
      setTimeout(() => setCopyState("idle"), 4000);
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
            <>
              <div className="fld" style={{ marginTop: 14 }}>
                <input
                  ref={linkInputRef}
                  readOnly
                  value={inviteLink}
                  style={{ fontSize: 12.5 }}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <span className="max" onClick={copy}>
                  {copyState === "ok" ? "已复制" : "复制"}
                </span>
                {canShare && (
                  <span className="max" onClick={share} style={{ marginLeft: 6 }}>
                    分享
                  </span>
                )}
              </div>
              {copyState === "manual" && (
                <div className="note warn" style={{ marginTop: 8 }}>
                  当前钱包浏览器不支持一键复制,已为你选中链接,请<b>长按上方链接 → 复制</b>,或直接分享本页给好友。
                </div>
              )}
            </>
          )}

          {/* 等级阶梯 */}
          <div className="tiers">
            {TIERS.map((t, i) => (
              <span className="ti" key={t.name} style={ref.rank === i && isConnected ? { borderColor: "var(--teal)", background: "rgba(94,234,212,.16)" } : undefined}>
                {t.name} <b>{t.rate}%</b>
              </span>
            ))}
          </div>
          <div className="note">
            等级按团队累计买入(U)升级:雪球 $5,000 · 雪坡 $10,000 · 雪崩 $20,000 · 冰川 $35,000 · 雪峰 $50,000;约每 15 分钟更新一次。
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
              <div className="k">我的买入</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? fmtUsd(ref.myBuyUsd) : dash}</div>
            </div>
            <div className="ic">
              <div className="k">直推人数</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? ref.directCount : dash}</div>
            </div>
          </div>

          {/* 返佣发放说明(链上不再自动发放,由项目方按记录人工打款)*/}
          <div className="acc" style={{ marginTop: 12, marginBottom: 12 }}>
            <div className="l">返佣发放方式</div>
            <div className="b" style={{ fontSize: 17 }}>
              项目方定期发放 <span>直接打到你的钱包</span>
            </div>
          </div>
          <div className="note">
            所有<b>通过本 DApp 的买入</b>都会记录在链上(买家、金额、推荐人、时间,任何人可查证)。
            项目方按这份链上记录<b>定期核对后直接把 SNOWBALL 打到推荐人钱包</b>,无需你手动领取。
            <br />
            自己去 PancakeSwap 或钱包里买的<b>不计入</b>——合约只记录经本 DApp 的买入。
          </div>
        </div>
      </div>
    </section>
  );
}
