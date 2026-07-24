import { EXPLORER, STAKING, DEPLOYED } from "@/lib/config";

export default function Hero() {
  return (
    <div className="hero">
      <div>
        <span className="tp">◆ Whale.fun 生态 · 签约计划</span>
        <h1>
          让雪球
          <br />
          <span className="grad">滚成价值共识</span>
        </h1>
        <p className="lead">
          在 Whale.fun 生态里<b>签约 SNOWBALL</b>:<span className="c">湿雪 + 长坡 + 时间</span> = 雪球效应。
          奖励每日按 USD 价值结算,本金到期原数奉还,链上透明、合约开源。
        </p>
        <div className="cta">
          <a className="btn bc" href="#sign" style={{ display: "inline-block", textAlign: "center" }}>
            开始签约
          </a>
          {DEPLOYED && (
            <a className="btn bg2" href={`${EXPLORER}/address/${STAKING}`} target="_blank" rel="noreferrer">
              查看合约 →
            </a>
          )}
        </div>
      </div>
      <div className="orb">
        <div className="ring anim-spin-26" style={{ width: 230, height: 230 }} />
        <div className="ring anim-spin-18" style={{ width: 170, height: 170 }} />
        <div className="ball anim-pulse" />
        <div className="cap">湿雪 + 长坡 + 足够的时间 = 雪球效应</div>
      </div>
    </div>
  );
}
