import { Placeholder } from "@/components/Placeholder";
import { SignOutButton } from "@/components/SignOutButton";
import { requireCrew } from "@/lib/auth";

export default async function ProfilePage() {
  const crew = await requireCrew();
  return (
    <div className="space-y-4">
      <Placeholder title="Profile" phase="Phase 2">
        <p className="mt-4 text-sm">
          {crew.full_name} · {crew.email}
        </p>
      </Placeholder>
      <SignOutButton />
    </div>
  );
}
