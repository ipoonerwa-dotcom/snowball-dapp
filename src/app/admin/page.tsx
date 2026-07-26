import { cookies } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import AdminReport from "@/components/AdminReport";
import Header from "@/components/Header";
import { ADMIN_COOKIE, adminConfigured, verifyToken } from "@/lib/adminAuth";

export const metadata = { title: "返佣对账 · SNOWBALL", robots: { index: false, follow: false } };
// 鉴权依赖请求里的 Cookie,不能静态化
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const jar = await cookies();
  const authed = verifyToken(jar.get(ADMIN_COOKIE)?.value);

  return (
    <div className="w">
      <Header />
      {authed ? <AdminReport /> : <AdminLogin configured={adminConfigured()} />}
    </div>
  );
}
