import { Placeholder } from "@/components/Placeholder";
import { requireCrew } from "@/lib/auth";

export default async function HomePage() {
  const crew = await requireCrew();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Hi, {crew.full_name.split(" ")[0]}</p>
      <Placeholder title="Home" phase="Phase 2">
        <p className="mt-2 text-sm text-muted">Earnings, recent activity, log hours and submit a claim.</p>
      </Placeholder>
    </div>
  );
}
