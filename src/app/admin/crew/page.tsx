import { AdminPage } from "@/components/admin/ui";
import { getCrewList } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { sgDate } from "@/lib/format";
import { hasServiceRole } from "@/lib/supabase/admin";
import { CrewClient } from "./CrewClient";

export default async function AdminCrew() {
  const [me, crew] = await Promise.all([requireAdmin(), getCrewList()]);
  return (
    <AdminPage>
      <CrewClient crew={crew} meId={me.id} today={sgDate()} canInvite={hasServiceRole} />
    </AdminPage>
  );
}
