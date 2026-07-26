"use client";

import { useState } from "react";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const j = await r.json();
      if (j.ok) window.location.reload();
      else setErr(j.error || "登录失败");
    } catch {
      setErr("网络错误,请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 48, maxWidth: 400 }}>
      <div className="eb"><i />返佣对账后台</div>
      <h2>管理员登录</h2>
      {!configured ? (
        <div className="note warn">
          后台尚未配置。请在 Vercel 的 Environment Variables 里设置
          <code> ADMIN_USER</code>、<code> ADMIN_PASS</code>、<code> ADMIN_SECRET</code> 后重新部署。
          <br />
          (未配置时一律拒绝访问,不会敞开。)
        </div>
      ) : (
        <form onSubmit={submit} className="cd" style={{ marginTop: 14 }}>
          <div className="fld" style={{ marginBottom: 10 }}>
            <input
              type="text" placeholder="账号" value={user} autoComplete="username"
              onChange={(e) => setUser(e.target.value)} style={{ fontFamily: "inherit" }}
            />
          </div>
          <div className="fld" style={{ marginBottom: 14 }}>
            <input
              type="password" placeholder="密码" value={pass} autoComplete="current-password"
              onChange={(e) => setPass(e.target.value)} style={{ fontFamily: "inherit" }}
            />
          </div>
          <button className="btn bc" style={{ width: "100%" }} disabled={busy || !user || !pass}>
            {busy ? "登录中…" : "登录"}
          </button>
          {err && <div className="note warn" style={{ marginTop: 10 }}>{err}</div>}
          <div className="note" style={{ marginTop: 10 }}>
            账号密码只在服务端校验,不会出现在网页代码里。登录状态保持 12 小时。
          </div>
        </form>
      )}
    </section>
  );
}
