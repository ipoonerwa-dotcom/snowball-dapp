/** 品牌图形:雪球徽章 logo + 邀请板块的星链雪球。纯内联 SVG,无外部依赖。 */

export function SnowballEmblem({ size = 35 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id="sbBg" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#12233f" />
          <stop offset="60%" stopColor="#0a1730" />
          <stop offset="100%" stopColor="#050b1c" />
        </radialGradient>
        <radialGradient id="sbHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a7d3ff" stopOpacity=".9" />
          <stop offset="42%" stopColor="#5a9bf0" stopOpacity=".4" />
          <stop offset="100%" stopColor="#3f7ad6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sbOrb" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="26%" stopColor="#e2eeff" />
          <stop offset="55%" stopColor="#a8c9f2" />
          <stop offset="80%" stopColor="#5f8fca" />
          <stop offset="100%" stopColor="#33608f" />
        </radialGradient>
        <linearGradient id="sbGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff4c8" />
          <stop offset="24%" stopColor="#f2d585" />
          <stop offset="50%" stopColor="#caa043" />
          <stop offset="72%" stopColor="#916416" />
          <stop offset="100%" stopColor="#d8ad4c" />
        </linearGradient>
        <linearGradient id="sbGem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dff0ff" />
          <stop offset="45%" stopColor="#6fb2f5" />
          <stop offset="100%" stopColor="#2f6fc0" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="198" fill="url(#sbBg)" />
      <circle cx="200" cy="196" r="132" fill="url(#sbHalo)" />
      <circle cx="200" cy="196" r="97" fill="url(#sbOrb)" />
      <circle cx="200" cy="196" r="97" fill="none" stroke="#eef6ff" strokeOpacity=".5" strokeWidth="1.6" />
      <circle cx="168" cy="170" r="16" fill="#fff" opacity=".28" />
      <circle cx="200" cy="200" r="120" fill="none" stroke="url(#sbGold)" strokeWidth="3.6" />
      <circle cx="200" cy="200" r="113" fill="none" stroke="url(#sbGold)" strokeWidth="1.6" opacity=".6" />
      <circle cx="200" cy="200" r="151" fill="none" stroke="url(#sbGold)" strokeWidth="14" />
      <circle cx="200" cy="200" r="151" fill="none" stroke="#5c3f12" strokeWidth="14" strokeDasharray="2 22.6" opacity=".38" />
      <circle cx="200" cy="200" r="158.5" fill="none" stroke="url(#sbGold)" strokeWidth="2.2" />
      <circle cx="200" cy="200" r="143.5" fill="none" stroke="url(#sbGold)" strokeWidth="2.2" />
      {[
        [200, 36],
        [364, 200],
        [200, 364],
        [36, 200],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d="M0 -19 L5.5 -5.5 19 0 5.5 5.5 0 19 -5.5 5.5 -19 0 -5.5 -5.5Z" fill="url(#sbGold)" />
          <path d="M0 -10 L3 -3 10 0 3 3 0 10 -3 3 -10 0 -3 -3Z" fill="url(#sbGem)" />
        </g>
      ))}
    </svg>
  );
}

export function NetworkOrb({ size = 116 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="nwGlow" cx="50%" cy="50%">
          <stop offset="0" stopColor="#38bdf8" stopOpacity=".5" />
          <stop offset="70%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nwCore" cx="38%" cy="30%">
          <stop offset="0" stopColor="#eafdff" />
          <stop offset="45%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#1fa6d6" />
        </radialGradient>
        <radialGradient id="nwSat" cx="36%" cy="30%">
          <stop offset="0" stopColor="#d8fbff" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#5568e6" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill="url(#nwGlow)" />
      <g className="anim-spin-30">
        <g stroke="#5eead4" strokeWidth="1.3" strokeOpacity=".42">
          <line x1="100" y1="100" x2="166" y2="100" />
          <line x1="100" y1="100" x2="133" y2="157" />
          <line x1="100" y1="100" x2="67" y2="157" />
          <line x1="100" y1="100" x2="34" y2="100" />
          <line x1="100" y1="100" x2="67" y2="43" />
          <line x1="100" y1="100" x2="133" y2="43" />
        </g>
        <circle cx="166" cy="100" r="8" fill="url(#nwSat)" />
        <circle cx="133" cy="157" r="6.5" fill="url(#nwSat)" />
        <circle cx="67" cy="157" r="7.5" fill="url(#nwSat)" />
        <circle cx="34" cy="100" r="6" fill="url(#nwSat)" />
        <circle cx="67" cy="43" r="8.5" fill="url(#nwSat)" />
        <circle cx="133" cy="43" r="6" fill="url(#nwSat)" />
        <circle cx="182" cy="58" r="2.6" fill="#5eead4" opacity=".5" />
        <circle cx="38" cy="158" r="2.6" fill="#38bdf8" opacity=".5" />
      </g>
      <circle cx="100" cy="100" r="27" fill="#061426" />
      <circle cx="100" cy="100" r="21" fill="url(#nwCore)" />
      <circle cx="92" cy="91" r="5" fill="#fff" opacity=".55" />
    </svg>
  );
}
