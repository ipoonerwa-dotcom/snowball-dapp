"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AutoConnect from "./AutoConnect";
import { CHAIN_ID, RPC_URL, WC_PROJECT_ID } from "@/lib/config";

// 钱包内置浏览器(TP/OKX/币安/imToken)与插件钱包走 injected;配了 projectId 才额外挂 WalletConnect
const connectors = [
  injected({ shimDisconnect: true }),
  ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })] : []),
];

export const wagmiConfig = createConfig({
  chains: [bsc, bscTestnet],
  connectors,
  transports: {
    [bsc.id]: http(CHAIN_ID === 56 ? RPC_URL : undefined),
    [bscTestnet.id]: http(CHAIN_ID === 97 ? RPC_URL : undefined),
  },
  ssr: true,
});

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnect />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
