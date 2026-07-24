import BindReferrerGate from "@/components/BindReferrerGate";
import BuyWidget from "@/components/BuyWidget";
import EffectSteps from "@/components/EffectSteps";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import MyPositions from "@/components/MyPositions";
import ReferralSection from "@/components/ReferralSection";
import SignSection from "@/components/SignSection";
import StatsRow from "@/components/StatsRow";
import { DEPLOYED, REFERRAL_ENABLED } from "@/lib/config";

export default function Home() {
  return (
    <div className="w">
      <Header />
      <BindReferrerGate />
      <Hero />
      {!DEPLOYED && (
        <div className="banner">
          ⚠ 签约合约尚未接入:请在部署后配置 NEXT_PUBLIC_STAKING / NEXT_PUBLIC_ORACLE 环境变量。
        </div>
      )}
      <StatsRow />
      {REFERRAL_ENABLED && (
        <section id="buy">
          <div className="eb">
            <i />
            买入 · Buy
          </div>
          <h2>买 SNOWBALL,邀请赚返佣</h2>
          <p className="sub">通过 DApp 买入才计入邀请归因;把邀请链接发给好友,团队越大分成越高(5%–10%)。</p>
          <div style={{ maxWidth: 480 }}>
            <BuyWidget />
          </div>
        </section>
      )}
      <div style={{ marginTop: 32 }}>
        <SignSection />
      </div>
      <MyPositions />
      <EffectSteps />
      <ReferralSection />
      <Footer />
    </div>
  );
}
