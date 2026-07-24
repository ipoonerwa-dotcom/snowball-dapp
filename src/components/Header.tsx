import { SnowballEmblem } from "./Art";
import WalletButton from "./WalletButton";
import { REFERRAL_ENABLED } from "@/lib/config";

export default function Header() {
  return (
    <div className="top">
      <div className="brand">
        <SnowballEmblem size={35} />
        SNOWBALL
        <span className="by"> · powered by Whale.fun</span>
      </div>
      <nav className="nav">
        {REFERRAL_ENABLED && <a href="#buy">买入</a>}
        <a href="#sign">签约</a>
        <a href="#effect">雪球效应</a>
        <a href="#invite">邀请</a>
      </nav>
      <WalletButton />
    </div>
  );
}
