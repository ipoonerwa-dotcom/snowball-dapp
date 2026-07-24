"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "@/lib/config";
import { shortAddr } from "@/lib/format";

export default function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const c = connectors[0];
    return (
      <button className="wal" disabled={isPending || !c} onClick={() => c && connect({ connector: c })}>
        {isPending ? "连接中…" : "连接钱包"}
      </button>
    );
  }

  if (chainId !== CHAIN_ID) {
    return (
      <button className="wal" onClick={() => switchChain({ chainId: CHAIN_ID })}>
        切换到 BSC
      </button>
    );
  }

  return (
    <button className="wal ghost" onClick={() => disconnect()} title="点击断开">
      {shortAddr(address)}
    </button>
  );
}
