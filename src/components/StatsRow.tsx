"use client";

import { DEPLOYED, MAX_APR_PCT } from "@/lib/config";
import { fmtCompact, fmtPrice, fmtUsd, toNum } from "@/lib/format";
import { useGlobalStats, usePrice } from "@/lib/useSnowball";

export default function StatsRow() {
  const { livePrice } = usePrice();
  const { rewardReserve, referralPool, totalPrincipal } = useGlobalStats();

  const p = toNum(livePrice);
  const principal = toNum(totalPrincipal);
  const reserve = toNum(rewardReserve);
  const refPool = toNum(referralPool);
  const dash = "—";

  return (
    <div className="stats">
      <div className="st">
        <div className="k">SNOWBALL 价格</div>
        <div className="v">{DEPLOYED && p ? fmtPrice(p) : dash}</div>
      </div>
      <div className="st">
        <div className="k">签约总额</div>
        <div className="v">{DEPLOYED && p ? fmtUsd(principal * p) : dash}</div>
      </div>
      <div className="st">
        <div className="k">签约总代币量</div>
        <div className="v">
          {DEPLOYED ? fmtCompact(principal, 1) : dash}
          <small> SNOWBALL</small>
        </div>
      </div>
      <div className="st hot">
        <div className="k">签约奖励</div>
        <div className="v">
          {DEPLOYED ? fmtCompact(reserve, 1) : dash}
          <small> SNOWBALL</small>
        </div>
      </div>
      <div className="st hot">
        <div className="k">推荐奖励池</div>
        <div className="v">
          {DEPLOYED ? fmtCompact(refPool, 1) : dash}
          <small> SNOWBALL</small>
        </div>
      </div>
      <div className="st">
        <div className="k">最高年化</div>
        <div className="v">≈{MAX_APR_PCT}%</div>
      </div>
    </div>
  );
}
