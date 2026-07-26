import { createHmac, timingSafeEqual } from "crypto";

/**
 * /admin 后台的服务端鉴权。
 *
 * 为什么不做在前端:前端代码用户随手就能看到,密码写进去等于没有。
 * 这里的账号密码只存在服务端环境变量(不带 NEXT_PUBLIC_ 前缀 → 永远不会进浏览器包),
 * 校验通过后下发一个 httpOnly + HMAC 签名的 Cookie,JS 读不到、改不了、伪造不了。
 *
 * 需要在 Vercel 配置的环境变量(Settings → Environment Variables):
 *   ADMIN_USER    管理员账号
 *   ADMIN_PASS    管理员密码
 *   ADMIN_SECRET  用于给登录票据签名的随机串(随便一串长字符,别人猜不到即可)
 *
 * 【重要】三个变量任缺其一 → 一律拒绝访问(fail closed)。
 * 绝不能"没配置就放行"——之前钱包白名单就是这么写的,结果没配 env 时后台对所有人敞开。
 */

const COOKIE_NAME = "sb_admin";
const MAX_AGE_SEC = 12 * 60 * 60; // 12 小时后需要重新登录

function envs() {
  return {
    user: process.env.ADMIN_USER ?? "",
    pass: process.env.ADMIN_PASS ?? "",
    secret: process.env.ADMIN_SECRET ?? "",
  };
}

/** 三项都配齐才算启用;没配齐一律拒绝(而不是放行) */
export function adminConfigured(): boolean {
  const { user, pass, secret } = envs();
  return user.length > 0 && pass.length > 0 && secret.length >= 16;
}

/** 定长比较,避免用响应时间逐字符猜密码 */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // 长度不同也走一次比较,保持耗时稳定
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function checkCredentials(user: string, pass: string): boolean {
  if (!adminConfigured()) return false;
  const e = envs();
  // 两项都比完再返回,避免"账号对不对"从响应时间上泄露
  const okUser = safeEqual(user, e.user);
  const okPass = safeEqual(pass, e.pass);
  return okUser && okPass;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** 票据 = 过期时间戳 + 签名。改一个字签名就对不上。 */
export function issueToken(): string {
  const { secret } = envs();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  return `${exp}.${sign(String(exp), secret)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token || !adminConfigured()) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false; // 过期
  return safeEqual(sig, sign(expStr, envs().secret));
}

export const ADMIN_COOKIE = COOKIE_NAME;
export const ADMIN_MAX_AGE = MAX_AGE_SEC;
