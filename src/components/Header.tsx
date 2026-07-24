"use client";

import { useState } from "react";
import { SnowballEmblem } from "./Art";
import WalletButton from "./WalletButton";
import { REFERRAL_ENABLED } from "@/lib/config";

const LINKS = [
  ...(REFERRAL_ENABLED ? [{ href: "#buy", label: "买入" }] : []),
  { href: "#sign", label: "签约" },
  { href: "#effect", label: "雪球效应" },
  { href: "#invite", label: "邀请" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <div className="top">
      <div className="brand">
        <SnowballEmblem size={35} />
        SNOWBALL
        <span className="by"> · powered by Whale.fun</span>
      </div>

      {/* 桌面:内联导航 */}
      <nav className="nav">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>

      <div className="hright">
        <WalletButton />
        {/* 手机:三条杠汉堡按钮(展开时变 X) */}
        <button
          type="button"
          className={`burger ${open ? "on" : ""}`}
          aria-label="菜单"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <i />
          <i />
          <i />
        </button>
      </div>

      {open && (
        <>
          <div className="mnav-mask" onClick={() => setOpen(false)} />
          <nav className="mnav">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
