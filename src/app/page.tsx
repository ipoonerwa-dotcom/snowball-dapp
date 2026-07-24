import EffectSteps from "@/components/EffectSteps";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import MyPositions from "@/components/MyPositions";
import ReferralSection from "@/components/ReferralSection";
import SignSection from "@/components/SignSection";
import StatsRow from "@/components/StatsRow";
import { DEPLOYED } from "@/lib/config";

export default function Home() {
  return (
    <div className="w">
      <Header />
      <Hero />
      {!DEPLOYED && (
        <div className="banner">
          ⚠ 签约合约尚未接入:请在部署后配置 NEXT_PUBLIC_STAKING / NEXT_PUBLIC_ORACLE 环境变量。
        </div>
      )}
      <StatsRow />
      <SignSection />
      <MyPositions />
      <EffectSteps />
      <ReferralSection />
      <Footer />
    </div>
  );
}
