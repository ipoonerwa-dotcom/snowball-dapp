import { BUY_ROUTER, CHAIN_ID, DEPLOYED, EXPLORER, ORACLE, REFERRAL_ENABLED, STAKING, TOKEN } from "@/lib/config";
import { shortAddr } from "@/lib/format";

export default function Footer() {
  const chainName = CHAIN_ID === 56 ? "BSC" : CHAIN_ID === 97 ? "BSC 测试网" : `Chain ${CHAIN_ID}`;
  return (
    <div className="ft">
      <div>
        SNOWBALL{" "}
        <a href={`${EXPLORER}/token/${TOKEN}`} target="_blank" rel="noreferrer">
          <code>{shortAddr(TOKEN)}</code>
        </a>
        {DEPLOYED && (
          <>
            {" · 签约合约 "}
            <a href={`${EXPLORER}/address/${STAKING}`} target="_blank" rel="noreferrer">
              <code>{shortAddr(STAKING)}</code>
            </a>
            {" · 预言机 "}
            <a href={`${EXPLORER}/address/${ORACLE}`} target="_blank" rel="noreferrer">
              <code>{shortAddr(ORACLE)}</code>
            </a>
          </>
        )}
        {REFERRAL_ENABLED && (
          <>
            {" · 买入合约 "}
            <a href={`${EXPLORER}/address/${BUY_ROUTER}`} target="_blank" rel="noreferrer">
              <code>{shortAddr(BUY_ROUTER)}</code>
            </a>
          </>
        )}
        {" · "}
        {chainName} · Whale.fun 生态
      </div>
      <div>
        奖励按 USD 价值每日结算,以链上 5 分钟均价为准;本金到期原数返还。加密资产价格波动,参与前请自行评估风险。
      </div>
    </div>
  );
}
