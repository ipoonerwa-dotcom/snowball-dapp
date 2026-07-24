import { NetworkOrb } from "./Art";

const TIERS = [
  { name: "雪花", pct: "5%" },
  { name: "使者", pct: "6%" },
  { name: "骑士", pct: "7%" },
  { name: "王子", pct: "8%" },
  { name: "国王", pct: "9%" },
  { name: "帝王", pct: "10%" },
];

export default function ReferralSection() {
  return (
    <section id="invite" className="comm">
      <div className="grid">
        <div>
          <div className="emblem-box">
            <NetworkOrb size={116} />
          </div>
          <h2>把雪球滚给更多人</h2>
          <p>
            邀请好友通过 DApp 买入,直推奖励实时到账、无上限。团队业绩(按 U 计)越高,等级越高,分成越多。
          </p>
          <div className="tiers">
            {TIERS.map((t) => (
              <span className="ti" key={t.name}>
                {t.name} <b>{t.pct}</b>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="iv">
            <div className="ic">
              <div className="k">我的等级</div>
              <div className="v">—</div>
            </div>
            <div className="ic">
              <div className="k">团队业绩</div>
              <div className="v">—</div>
            </div>
          </div>
          <div className="iv">
            <div className="ic">
              <div className="k">累计邀请奖励</div>
              <div className="v">—</div>
            </div>
            <div className="ic">
              <div className="k">直推人数</div>
              <div className="v">—</div>
            </div>
          </div>
          <button className="btn bc" style={{ width: "100%", marginTop: 12 }} disabled>
            邀请板块 · 二期开放
          </button>
          <div className="note">买入返佣与团队等级为第二期功能,上线后此处直接出数据。</div>
        </div>
      </div>
    </section>
  );
}
