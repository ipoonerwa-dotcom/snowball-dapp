"use client";

import { useEffect, useRef } from "react";
import { useAccount, useConnect } from "wagmi";

/**
 * 钱包内置浏览器(TP/OKX/imToken/币安)自动连接:
 * 这类浏览器打开 DApp 时已注入并授权了 window.ethereum,但 wagmi 不点"连接"不会接管,
 * 造成"钱包显示已连接、页面还让你连接"的割裂。这里静默查 eth_accounts(不弹窗),
 * 有已授权账户就直接接管注入连接器。普通浏览器无注入则毫无副作用。
 */
export default function AutoConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const tried = useRef(false);

  useEffect(() => {
    if (isConnected || tried.current) return;

    let cancelled = false;
    const attempt = () => {
      const eth = (window as { ethereum?: { request: (a: { method: string }) => Promise<string[]> } }).ethereum;
      if (!eth) return false;
      eth
        .request({ method: "eth_accounts" }) // 只读已授权账户,不会弹授权框
        .then((accs) => {
          if (cancelled || !accs || accs.length === 0) return;
          const inj = connectors.find((c) => c.id === "injected" || c.type === "injected");
          if (inj) {
            tried.current = true;
            connect({ connector: inj });
          }
        })
        .catch(() => {});
      return true;
    };

    // 个别钱包注入偏晚:立刻试一次,没注入则 800ms 后再试一次
    if (!attempt()) {
      const t = setTimeout(attempt, 800);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [isConnected, connect, connectors]);

  return null;
}
