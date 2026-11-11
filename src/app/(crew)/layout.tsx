import { TabBar } from "@/components/TabBar";
import { requireCrew } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Crew area: only signed-in crew (role 'crew', not deactivated). Admins are sent to /admin. */
export default async function CrewLayout({ children }: { children: React.ReactNode }) {
  await requireCrew();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pt-6 pb-24">
      {children}
      <TabBar />
    </div>
  );
}
