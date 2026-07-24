const STEPS = [
  { n: "01", h: "找到湿雪", p: "好的起点和环境" },
  { n: "02", h: "开始滚动", p: "签约,迈出第一步" },
  { n: "03", h: "持续积累", p: "时间 + 复利效应" },
  { n: "04", h: "越滚越大", p: "价值不断增长" },
  { n: "05", h: "抵达远方", p: "长期主义的胜利" },
];

export default function EffectSteps() {
  return (
    <section id="effect" style={{ marginTop: 32 }}>
      <div className="eb">
        <i />
        雪球效应
      </div>
      <h2>越滚越大,抵达远方</h2>
      <div className="fly">
        {STEPS.map((s) => (
          <div className="sp" key={s.n}>
            <div className="n">{s.n}</div>
            <div className="h">{s.h}</div>
            <div className="p">{s.p}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
