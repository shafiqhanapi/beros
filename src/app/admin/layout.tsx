import { AdminSidebar, AdminTabBar } from "@/components/admin/AdminNav";
import { getBadges } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Admin area: role 'admin' and status 'active' (same rule as is_admin() in the database). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, badges] = await Promise.all([requireAdmin(), getBadges()]);
  return (
    <div className="min-h-dvh">
      <AdminSidebar name={admin.full_name} initials={initials(admin.full_name)} badges={badges} />
      <div className="md:pl-[232px]">{children}</div>
      <AdminTabBar badges={badges} />
    </div>
  );
}
