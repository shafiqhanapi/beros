import { Sidebar, TabBar } from "@/components/CrewNav";
import { requireCrew } from "@/lib/auth";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Crew area: only signed-in crew (role 'crew', not deactivated). Admins are sent to /admin. */
export default async function CrewLayout({ children }: { children: React.ReactNode }) {
  const crew = await requireCrew();
  return (
    <div className="min-h-dvh">
      <Sidebar name={crew.full_name} initials={initials(crew.full_name)} isAdmin={crew.role === "admin" && crew.status === "active"} />
      <div className="md:pl-[232px]">{children}</div>
      <TabBar />
    </div>
  );
}
