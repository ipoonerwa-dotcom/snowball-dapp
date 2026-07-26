"use client";

/**
 * 返佣对账后台 —— 目标:每天跟社区对账时,一眼看清「给哪个地址发多少 SNOWBALL」。
 *
 * 数据全部来自链上 view 调用(不依赖 getLogs / 不依赖数据库):
 *   recorder.getPurchases()  逐笔买入(买家/推荐人/金额/时间)
 *   recorder.buyerSnapshots() 每个买家当前还持有多少
 *   staking.positions()       每个买家质押了多少(质押也算持有)
 *
 * 返佣不由合约发放,由项目方看完这张表手动打款 —— 所以刷单最多污染报表,薅不走钱。
 *
 * ── 两条社区规则,全部落在这里的计算口径 ──
 *  规则1「卖出就不算团队业绩」:业绩按【留存比例】折算,卖掉多少就少算多少。
 *  规则2「真实净增持才有返佣,卖了再买回来不重复」:
 *        用【累计口径】—— 应发总额按"当前还持有多少"算,再减去"已发过多少"。
 *        卖掉再买回同样的量,当前持仓没变 → 应发总额不变 → 本次应发 = 0。
 *        这天然杜绝了"来回刷同一笔"重复领取。
 *
 *  (原先还有一条「买入满 30 分钟才计入」——那是为链上自动发放设的结算窗口。
 *   改人工发放后,人工复核本身就是延迟,再压 30 分钟只会让报表少一截,故取消:买入即显示。)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { RECORDER_ABI } from "@/lib/recorderAbi";
import { STAKING_ABI } from "@/lib/abis";
import { BUY_ROUTER, CHAIN_ID, STAKING, TIERS } from "@/lib/config";
import { fmt, fmtUsd } from "@/lib/format";
import { copyText } from "@/lib/clipboard";
import { usePrice } from "@/lib/useSnowball";

// 白名单见 config.ts:ADMINS(默认写死 owner 钱包,env NEXT_PUBLIC_ADMINS 可追加)

type Row = {
  id: number;
  buyer: `0x${string}`;
  referrer: `0x${string}`;
  bnbIn: bigint;
  usd: bigint;
  tokens: bigint;
  time: number;
};

type BuyerInfo = { held: bigint; staked: bigint };

const ZERO = "0x0000000000000000000000000000000000000000";
const dayKey = (ts: number) => new Date(ts * 1000).toLocaleDateString("sv-SE"); // YYYY-MM-DD
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** 已发放台账(浏览器本地保存,可导出备份) */
const PAID_KEY = "snowball-paid-usd-v1";

function loadPaid(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PAID_KEY) || "{}"); } catch { return {}; }
}
function savePaid(v: Record<string, number>) {
  try { localStorage.setItem(PAID_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

export default function AdminReport() {
  const client = usePublicClient({ chainId: CHAIN_ID });
  const { livePrice } = usePrice();

  const [rows, setRows] = useState<Row[]>([]);
  const [info, setInfo] = useState<Record<string, BuyerInfo>>({});
  const [tiers, setTiers] = useState<Record<string, { name: string; bps: number }>>({});
  const [paid, setPaid] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [day, setDay] = useState<string>("ALL");
  // 规则:通过 DApp 买入即计入返佣(合约只记录 DApp 买入,链下自己买的根本不进表)。
  // 「排除已清仓」默认关闭,只作为发现刷单后的一键工具——留存率那一列始终可见。
  const [excludeDumped, setExcludeDumped] = useState(false);
  const [minUsd, setMinUsd] = useState("0");
  const [copied, setCopied] = useState("");

  // 访问控制已在服务端完成(/admin 页面校验 httpOnly 登录 Cookie 后才渲染本组件),
  // 这里不再重复要求连钱包 —— 后台只是读链上公开数据,连钱包对对账没有意义。
  const allowed = true;

  const load = useCallback(async () => {
    if (!client || !allowed) return; // 未授权不拉数据
    setLoading(true);
    setErr("");
    try {
      const n = (await client.readContract({
        address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "purchasesLength",
      })) as bigint;

      const out: Row[] = [];
      const PAGE = 200n;
      for (let off = 0n; off < n; off += PAGE) {
        const [buyers, referrers, bnbIn, usd, tokens, times] = (await client.readContract({
          address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "getPurchases", args: [off, PAGE],
        })) as [readonly `0x${string}`[], readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly bigint[], readonly bigint[]];
        for (let i = 0; i < buyers.length; i++) {
          out.push({
            id: Number(off) + i,
            buyer: buyers[i], referrer: referrers[i],
            bnbIn: bnbIn[i], usd: usd[i], tokens: tokens[i], time: Number(times[i]),
          });
        }
      }
      setRows(out);

      // 每个买家:当前持有 + 质押量
      const uniq = [...new Set(out.map((r) => r.buyer))] as `0x${string}`[];
      const map: Record<string, BuyerInfo> = {};
      if (uniq.length) {
        const [, , , heldNow] = (await client.readContract({
          address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "buyerSnapshots", args: [uniq],
        })) as [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly bigint[]];

        const staked = await Promise.all(
          uniq.map(async (u) => {
            try {
              const cnt = (await client.readContract({
                address: STAKING, abi: STAKING_ABI, functionName: "positionCount", args: [u],
              })) as bigint;
              let sum = 0n;
              for (let i = 0n; i < cnt; i++) {
                const p = (await client.readContract({
                  address: STAKING, abi: STAKING_ABI, functionName: "positions", args: [u, i],
                })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
                if (!p[6]) sum += p[0]; // 未取回的本金
              }
              return sum;
            } catch { return 0n; }
          })
        );
        uniq.forEach((u, i) => { map[u.toLowerCase()] = { held: heldNow[i], staked: staked[i] }; });
      }
      setInfo(map);

      // 推荐人的等级 → 费率(链上 keeper 推送,展示+计费率用)
      const refs = [...new Set(out.map((r) => r.referrer).filter((r) => r !== ZERO))] as `0x${string}`[];
      const tmap: Record<string, { name: string; bps: number }> = {};
      await Promise.all(refs.map(async (r) => {
        try {
          const t = (await client.readContract({
            address: BUY_ROUTER, abi: RECORDER_ABI, functionName: "tierOf", args: [r],
          })) as readonly [number, string, number, bigint, bigint];
          tmap[r.toLowerCase()] = { name: TIERS[Math.min(Number(t[0]), 5)]?.name ?? t[1], bps: Number(t[2]) };
        } catch { tmap[r.toLowerCase()] = { name: TIERS[0].name, bps: 500 }; }
      }));
      setTiers(tmap);
    } catch (e) {
      setErr((e as Error)?.message?.slice(0, 160) || "读取失败");
    } finally {
      setLoading(false);
    }
  }, [client, allowed]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPaid(loadPaid()); }, []);

  /** 打完款后点一下:把本次应发计入已发台账,下次就不会重复算 */
  function markPaid(referrer: string, dueUsd: number) {
    const k = referrer.toLowerCase();
    const next = { ...paid, [k]: (paid[k] ?? 0) + dueUsd };
    setPaid(next);
    savePaid(next);
  }
  function markAllPaid() {
    const next = { ...paid };
    for (const p of payout) if (p.dueUsd > 0) next[p.referrer.toLowerCase()] = (next[p.referrer.toLowerCase()] ?? 0) + p.dueUsd;
    setPaid(next);
    savePaid(next);
  }
  function exportPaid() {
    const blob = new Blob([JSON.stringify(paid, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "snowball-paid-ledger.json";
    a.click();
  }
  function importPaid(file: File) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const v = JSON.parse(String(fr.result));
        if (v && typeof v === "object") { setPaid(v); savePaid(v); }
      } catch { /* ignore */ }
    };
    fr.readAsText(file);
  }

  const days = useMemo(() => {
    const s = new Set(rows.map((r) => dayKey(r.time)));
    return ["ALL", ...[...s].sort().reverse()];
  }, [rows]);

  /**
   * 每个买家的「有效业绩」——两条规则都在这里:
   *   规则1+2:有效业绩 = 累计买入USD × 留存比例(留存 = 当前持有+质押,按累计买入量封顶)
   *           卖掉 → 留存降 → 业绩降;卖了再买回来 → 持仓没净增 → 业绩不变 → 不会重复计佣
   *   买入即计入,不再有 30 分钟等待。
   */
  const perBuyer = useMemo(() => {
    const m: Record<string, {
      buyer: string; referrer: string; boughtUsd: number; boughtTokens: bigint;
      kept: bigint; held: bigint; staked: bigint;
      retainRatio: number; qualifiedUsd: number; lastBuy: number;
    }> = {};

    for (const r of rows) {
      const k = r.buyer.toLowerCase();
      const bi = info[k];
      m[k] ??= {
        buyer: r.buyer, referrer: r.referrer, boughtUsd: 0, boughtTokens: 0n,
        kept: (bi?.held ?? 0n) + (bi?.staked ?? 0n), held: bi?.held ?? 0n, staked: bi?.staked ?? 0n,
        retainRatio: 0, qualifiedUsd: 0, lastBuy: 0,
      };
      const e = m[k];
      if (r.referrer !== ZERO) e.referrer = r.referrer;
      e.lastBuy = Math.max(e.lastBuy, r.time);
      e.boughtUsd += Number(formatUnits(r.usd, 18));
      e.boughtTokens += r.tokens;
    }

    for (const e of Object.values(m)) {
      const retained = e.kept < e.boughtTokens ? e.kept : e.boughtTokens; // 规则1:按留存封顶
      e.retainRatio = e.boughtTokens > 0n
        ? Number((retained * 10000n) / e.boughtTokens) / 10000
        : 0;
      e.qualifiedUsd = e.boughtUsd * e.retainRatio; // 规则3:净增持口径,重复买卖不叠加
    }
    return m;
  }, [rows, info]);

  /** 逐笔明细(用于人工核对,按日期筛选) */
  const detail = useMemo(() => {
    const min = Number(minUsd || "0");
    return rows
      .filter((r) => day === "ALL" || dayKey(r.time) === day)
      .map((r) => {
        const e = perBuyer[r.buyer.toLowerCase()];
        const keepPct = (e?.retainRatio ?? 0) * 100;
        const dumped = keepPct < 10;
        const usdNum = Number(formatUnits(r.usd, 18));
        return {
          ...r,
          held: e?.held ?? 0n, staked: e?.staked ?? 0n,
          keepPct, dumped,
          noRef: r.referrer === ZERO,
          tooSmall: usdNum < min,
          counted: r.referrer !== ZERO && usdNum >= min && !(excludeDumped && dumped),
        };
      });
  }, [rows, perBuyer, day, excludeDumped, minUsd]);

  /** 发放清单:累计应发 − 已发 = 本次应发(累计口径,天然实现规则2) */
  const payout = useMemo(() => {
    const price = Number(formatUnits(livePrice, 18)) || 0;
    const min = Number(minUsd || "0");
    const agg: Record<string, {
      referrer: string; qualifiedUsd: number;
      buyers: Set<string>; dumpedBuyers: number;
    }> = {};

    for (const e of Object.values(perBuyer)) {
      if (e.referrer === ZERO) continue;
      if (e.boughtUsd < min && e.qualifiedUsd < min) continue;
      if (excludeDumped && e.retainRatio < 0.1) continue;
      const k = e.referrer.toLowerCase();
      agg[k] ??= { referrer: e.referrer, qualifiedUsd: 0, buyers: new Set(), dumpedBuyers: 0 };
      agg[k].qualifiedUsd += e.qualifiedUsd;
      agg[k].buyers.add(e.buyer.toLowerCase());
      if (e.retainRatio < 0.1) agg[k].dumpedBuyers += 1;
    }

    return Object.values(agg)
      .map((a) => {
        const r = tiers[a.referrer.toLowerCase()];
        const rate = (r?.bps ?? 500) / 10000;
        const entitledUsd = a.qualifiedUsd * rate;      // 累计应发
        const paidUsd = paid[a.referrer.toLowerCase()] ?? 0; // 已发
        const dueUsd = Math.max(0, entitledUsd - paidUsd);   // 本次应发
        return {
          ...a,
          tierName: r?.name ?? "雪花",
          rate,
          entitledUsd,
          paidUsd,
          dueUsd,
          dueTokens: price > 0 ? dueUsd / price : 0,
          buyerCount: a.buyers.size,
          overpaid: paidUsd > entitledUsd + 0.01, // 之前多发了(下线后来卖了)
        };
      })
      .filter((p) => p.entitledUsd > 0 || p.paidUsd > 0)
      .sort((x, y) => y.dueUsd - x.dueUsd);
  }, [perBuyer, livePrice, tiers, paid, excludeDumped, minUsd]);

  const totals = useMemo(() => ({
    dueUsd: payout.reduce((s, p) => s + p.dueUsd, 0),
    dueToken: payout.reduce((s, p) => s + p.dueTokens, 0),
    entitled: payout.reduce((s, p) => s + p.entitledUsd, 0),
    paid: payout.reduce((s, p) => s + p.paidUsd, 0),
    qualified: payout.reduce((s, p) => s + p.qualifiedUsd, 0),
  }), [payout]);

  async function copyBatch() {
    // 批量转账格式:地址,数量  —— 可直接粘进批量转账工具(只含本次应发 > 0 的)
    const text = payout.filter((p) => p.dueTokens > 0)
      .map((p) => `${p.referrer},${p.dueTokens.toFixed(4)}`).join("\n");
    const ok = await copyText(text);
    setCopied(ok ? `已复制 ${payout.filter((p) => p.dueTokens > 0).length} 条转账清单` : "复制失败,请手动选中");
    setTimeout(() => setCopied(""), 2500);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  function exportCsv() {
    const head = "推荐人,等级,有效业绩USD,费率,累计应发USD,已发USD,本次应发USD,本次应发SNOWBALL,下线人数\n";
    const body = payout
      .map((p) => [
        p.referrer, p.tierName, p.qualifiedUsd.toFixed(2), `${(p.rate * 100).toFixed(1)}%`,
        p.entitledUsd.toFixed(2), p.paidUsd.toFixed(2), p.dueUsd.toFixed(2),
        p.dueTokens.toFixed(4), p.buyerCount,
      ].join(","))
      .join("\n");
    const blob = new Blob(["﻿" + head + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `snowball-payout-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <section style={{ marginTop: 28 }}>
      <div className="adm-top">
        <div>
          <div className="eb"><i />返佣对账 · Payout</div>
          <h2 style={{ margin: "10px 0 3px" }}>每日返佣发放清单</h2>
        </div>
        <button className="mini-btn ghost" onClick={logout}>退出登录</button>
      </div>
      <p className="sub">
        数据直接读链上买入记录。返佣<b>不由合约发放</b>,请按下表人工打款——刷单只能污染报表,拿不走钱。
      </p>

      {/* 筛选 */}
      <div className="adm-bar">
        <label>日期
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            {days.map((d) => <option key={d} value={d}>{d === "ALL" ? "全部" : d}</option>)}
          </select>
        </label>
        <label>最小买入(USD)
          <input type="number" min="0" value={minUsd} onChange={(e) => setMinUsd(e.target.value)} style={{ width: 80 }} />
        </label>
        <label className="chk" title="默认全部计入;发现刷单时可勾选一键剔除留存≈0的地址">
          <input type="checkbox" checked={excludeDumped} onChange={(e) => setExcludeDumped(e.target.checked)} />
          剔除已清仓(可选)
        </label>
        <button className="mini-btn" onClick={load} disabled={loading}>{loading ? "读取中…" : "刷新"}</button>
      </div>
      {err && <div className="note warn">{err}</div>}

      {/* 汇总 */}
      <div className="stats" style={{ marginTop: 14 }}>
        <div className="st hot"><div className="k">本次应发</div><div className="v">{fmt(totals.dueToken, 2)}<small> SNOWBALL</small></div></div>
        <div className="st"><div className="k">本次应发(USD)</div><div className="v">{fmtUsd(totals.dueUsd)}</div></div>
        <div className="st"><div className="k">有效团队业绩</div><div className="v">{fmtUsd(totals.qualified)}</div></div>
        <div className="st"><div className="k">累计应发 / 已发</div><div className="v" style={{ fontSize: 17 }}>{fmtUsd(totals.entitled)}<small> / {fmtUsd(totals.paid)}</small></div></div>
      </div>

      {/* 发放清单 */}
      <h3 style={{ marginTop: 26 }}>① 发放清单(按推荐人 · 累计口径)</h3>
      <div className="adm-bar">
        <button className="mini-btn" onClick={copyBatch} disabled={!payout.some((p) => p.dueTokens > 0)}>复制批量转账格式</button>
        <button className="mini-btn ghost" onClick={exportCsv} disabled={!payout.length}>导出 CSV</button>
        <button className="mini-btn ghost" onClick={markAllPaid} disabled={!payout.some((p) => p.dueUsd > 0)}>✓ 全部标记已发放</button>
        <button className="mini-btn ghost" onClick={exportPaid}>备份台账</button>
        <label className="mini-btn ghost" style={{ cursor: "pointer" }}>
          恢复台账
          <input type="file" accept="application/json" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && importPaid(e.target.files[0])} />
        </label>
        {copied && <span className="ok-tip">{copied}</span>}
      </div>
      <div className="tbl-wrap">
        <table className="adm-tbl">
          <thead>
            <tr>
              <th>推荐人</th><th>等级</th><th>有效业绩(USD)</th><th>费率</th>
              <th>累计应发</th><th>已发</th><th>本次应发 USD</th><th>本次应发 SNOWBALL</th>
              <th>下线</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {payout.map((p) => (
              <tr key={p.referrer} className={p.dueUsd > 0 ? "" : "muted"}>
                <td><code title={p.referrer}>{short(p.referrer)}</code></td>
                <td>{p.tierName}</td>
                <td>{fmtUsd(p.qualifiedUsd)}</td>
                <td>{(p.rate * 100).toFixed(1)}%</td>
                <td>{fmtUsd(p.entitledUsd)}</td>
                <td>{fmtUsd(p.paidUsd)}{p.overpaid && <span className="bad" title="下线后来卖出,应发额已下降">⚠</span>}</td>
                <td>{fmtUsd(p.dueUsd)}</td>
                <td className="hi">{p.dueTokens > 0 ? fmt(p.dueTokens, 4) : "—"}</td>
                <td>{p.buyerCount}{p.dumpedBuyers > 0 && <span className="bad" title={`${p.dumpedBuyers} 个下线已清仓`}> ({p.dumpedBuyers}清)</span>}</td>
                <td>
                  {p.dueUsd > 0 && (
                    <button className="mini-btn" style={{ padding: "3px 8px", fontSize: 11 }}
                      onClick={() => markPaid(p.referrer, p.dueUsd)}>已发</button>
                  )}
                </td>
              </tr>
            ))}
            {!payout.length && <tr><td colSpan={10} className="empty">{loading ? "读取中…" : "暂无需要发放的返佣"}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 逐笔明细 */}
      <h3 style={{ marginTop: 26 }}>② 逐笔明细(判定依据)</h3>
      <div className="tbl-wrap">
        <table className="adm-tbl">
          <thead>
            <tr>
              <th>时间</th><th>买家</th><th>买入</th><th>USD</th>
              <th>到手币</th><th>当前持有</th><th>已质押</th><th>留存</th><th>推荐人</th><th>计入</th>
            </tr>
          </thead>
          <tbody>
            {detail.map((d) => (
              <tr key={d.id} className={d.counted ? "" : "muted"}>
                <td>{new Date(d.time * 1000).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                <td><code title={d.buyer}>{short(d.buyer)}</code></td>
                <td>{fmt(Number(formatEther(d.bnbIn)), 4)} BNB</td>
                <td>{fmtUsd(Number(formatUnits(d.usd, 18)))}</td>
                <td>{fmt(Number(formatUnits(d.tokens, 18)), 2)}</td>
                <td>{fmt(Number(formatUnits(d.held, 18)), 2)}</td>
                <td>{d.staked > 0n ? <b className="hi">{fmt(Number(formatUnits(d.staked, 18)), 2)}</b> : "—"}</td>
                <td className={d.dumped ? "bad" : "good"}>{d.keepPct.toFixed(0)}%</td>
                <td>{d.noRef ? <span className="muted">无</span> : <code title={d.referrer}>{short(d.referrer)}</code>}</td>
                <td>
                  {d.counted ? <span className="good">✓</span>
                    : <span className="bad" title={d.noRef ? "没有推荐人" : d.tooSmall ? "低于最小金额" : "已清仓"}>
                        {d.noRef ? "无上级" : d.tooSmall ? "金额小" : "已清仓"}
                      </span>}
                </td>
              </tr>
            ))}
            {!detail.length && <tr><td colSpan={10} className="empty">{loading ? "读取中…" : "暂无记录"}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="note" style={{ marginTop: 16 }}>
        <b>计入规则</b>:只有<b>通过本 DApp 买入</b>才计入返佣。用户自己去 PancakeSwap 或钱包里买的,
        合约根本不会记录,不会出现在本表 —— 这是链上强制的,不靠人工判断。
        <br />
        买入<b>即时显示</b>,没有等待期。
        <br />
        <b>怎么用</b>:① 扫一眼「逐笔明细」的<b>留存</b>列有没有异常 →
        ② 回「发放清单」点「复制批量转账格式」→ ③ 粘进批量转账工具打款 →
        ④ 打完点「全部标记已发放」(下次只算新增的,不会重复发)。
        <br />
        <b>两条计算规则</b>:①<b>卖出不算业绩</b> —— 有效业绩按留存比例折算,卖多少少算多少;
        ②<b>只认真实净增持</b> —— 应发按累计口径算再减已发,卖了再买回来持仓没净增 → 本次应发 = 0,
        不会重复领。
        <br />
        <b>留存</b> =(当前持有 + 已质押)÷ 累计买到的量。接近 0% 说明买完就砸(疑似刷单),
        可勾选上方「剔除已清仓」一键排除。<b>已质押</b>的是最优质用户(签约锁仓),建议优先发放。
      </div>
    </section>
  );
}
