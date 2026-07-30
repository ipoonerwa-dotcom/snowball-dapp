"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { NetworkOrb } from "./Art";
import { copyText } from "@/lib/clipboard";
import { REFERRAL_ENABLED, TIERS } from "@/lib/config";
import { fmtUsd } from "@/lib/format";
import { useDirectStats, useReferral } from "@/lib/useReferral";

export default function ReferralSection() {
  const { address, isConnected } = useAccount();
  const ref = useReferral();
  // 直推/团队业绩都实时算(不走 keeper),两个数永远自洽
  const { directUsd, teamUsd, teamStakedTok, teamStakedUsd } = useDirectStats();

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
            买入 SNOWBALL,你按团队等级拿 <b>5%–10%</b> 返佣,由<b>社区定期核对后直接打到你钱包</b>,不用手动领。
            团队 U 业绩越高,等级越高,分成越多。
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
            等级按团队累计买入(U)升级:雪球 $5,000 · 雪坡 $10,000 · 雪崩 $20,000 · 冰川 $35,000 · 雪峰 $50,000。
            业绩数字<b>实时更新</b>(下线卖出会相应减少);等级约每 15 分钟重算一次。
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
              <div className="v">{REFERRAL_ENABLED && isConnected ? fmtUsd(teamUsd) : dash}</div>
            </div>
          </div>
          {/* 团队质押业绩:与「我的签约」同一口径(币按本金,U 按入场价锁定值),
              团队长看到的数字和成员自己看到的对得上。只算未取回的仓位。 */}
          <div className="iv">
            <div className="ic">
              <div className="k">团队质押(U)</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? fmtUsd(teamStakedUsd) : dash}</div>
            </div>
            <div className="ic">
              <div className="k">团队质押(币)</div>
              <div className="v">
                {REFERRAL_ENABLED && isConnected
                  ? teamStakedTok.toLocaleString("en-US", { maximumFractionDigits: 2 })
                  : dash}
              </div>
            </div>
          </div>
          <div className="iv">
            <div className="ic">
              <div className="k">直推人数</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? ref.directCount : dash}</div>
            </div>
            <div className="ic">
              <div className="k">直推业绩</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? fmtUsd(directUsd) : dash}</div>
            </div>
          </div>
          <div className="iv">
            <div className="ic">
              <div className="k">我的买入</div>
              <div className="v">{REFERRAL_ENABLED && isConnected ? fmtUsd(ref.myBuyUsd) : dash}</div>
            </div>
            <div className="ic">
              <div className="k">上级</div>
              <div className="v" style={{ fontSize: 15 }}>
                {!REFERRAL_ENABLED || !isConnected ? dash : ref.bound ? `${ref.referrer.slice(0, 6)}…${ref.referrer.slice(-4)}` : "未绑定"}
              </div>
            </div>
          </div>

          {/* 返佣发放说明(链上不再自动发放,由社区按记录人工打款)*/}
          <div className="acc" style={{ marginTop: 12, marginBottom: 12 }}>
            <div className="l">返佣发放方式</div>
            <div className="b" style={{ fontSize: 17 }}>
              社区定期发放 <span>直接打到你的钱包</span>
            </div>
          </div>
          <div className="note">
            所有<b>通过本 DApp 的买入</b>都会记录在链上(买家、金额、推荐人、时间,任何人可查证)。
            社区按这份链上记录<b>定期核对后直接把 SNOWBALL 打到推荐人钱包</b>,无需你手动领取。
            <br />
            自己去 PancakeSwap 或钱包里买的<b>不计入</b>——合约只记录经本 DApp 的买入。
          </div>
        </div>
      </div>
    </section>
  );
}
