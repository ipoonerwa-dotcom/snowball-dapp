import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, adminConfigured, checkCredentials, issueToken } from "@/lib/adminAuth";

export const runtime = "nodejs";

/** 简易防爆破:同一 IP 连续失败达上限后冷却一段时间 */
const FAILS = new Map<string, { n: number; until: number }>();
const MAX_FAILS = 8;
const COOLDOWN_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  if (!adminConfigured()) {
    // 没配置 = 不可用,而不是放行
    return NextResponse.json({ ok: false, error: "后台未配置(缺 ADMIN_USER / ADMIN_PASS / ADMIN_SECRET)" }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rec = FAILS.get(ip);
  if (rec && rec.n >= MAX_FAILS && Date.now() < rec.until) {
    const mins = Math.ceil((rec.until - Date.now()) / 60000);
    return NextResponse.json({ ok: false, error: `尝试次数过多,请 ${mins} 分钟后再试` }, { status: 429 });
  }

  let user = "";
  let pass = "";
  try {
    const body = await req.json();
    user = String(body?.user ?? "");
    pass = String(body?.pass ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }

  if (!checkCredentials(user, pass)) {
    const n = (rec?.n ?? 0) + 1;
    FAILS.set(ip, { n, until: Date.now() + COOLDOWN_MS });
    return NextResponse.json({ ok: false, error: "账号或密码不正确" }, { status: 401 });
  }

  FAILS.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, issueToken(), {
    httpOnly: true,   // JS 读不到
    secure: true,     // 只走 https
    sameSite: "lax",  // 防 CSRF
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}
