import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Providers from "@/components/Providers";
import "./globals.css";

const SITE = "SNOWBALL 签约";
const DESC = "签约 SNOWBALL:奖励每日按 USD 价值结算,本金到期原数返还,链上透明、合约开源。";

export const metadata: Metadata = {
  metadataBase: new URL("https://snowball-dapp-alpha.vercel.app"),
  title: SITE,
  description: DESC,
  applicationName: "SNOWBALL",
  openGraph: {
    type: "website",
    siteName: "SNOWBALL",
    title: SITE,
    description: DESC,
    locale: "zh_CN",
  },
  twitter: {
    card: "summary",
    title: SITE,
    description: DESC,
  },
};

export const viewport: Viewport = {
  themeColor: "#04070f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
