import AdminReport from "@/components/AdminReport";
import Header from "@/components/Header";

export const metadata = { title: "返佣对账 · SNOWBALL", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="w">
      <Header />
      <AdminReport />
    </div>
  );
}
