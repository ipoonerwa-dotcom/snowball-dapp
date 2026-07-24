"use client";

import { DEPLOYED, MAX_APR_PCT, REWARD_POOL_TARGET } from "@/lib/config";
import { fmtCompact, fmtPrice, fmtUsd, toNum } from "@/lib/format";
import { useGlobalStats, usePrice } from "@/lib/useSnowball";

export default function StatsRow() {
  const { price } = usePrice();
  const { rewardReserve, totalPrincipal } = useGlobalStats();

  const p = toNum(price);
  const principal = toNum(totalPrincipal);
  const reserve = toNum(rewardReserve);
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
      <div className="st hot">
        <div className="k">奖励池剩余</div>
        <div className="v">
          {DEPLOYED ? fmtCompact(reserve, 0) : dash}
          <small> / {fmtCompact(REWARD_POOL_TARGET, 0)}</small>
        </div>
      </div>
      <div className="st">
        <div className="k">最高年化</div>
        <div className="v">≈{MAX_APR_PCT}%</div>
      </div>
    </div>
  );
}
