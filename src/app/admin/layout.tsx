import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Admin area: role 'admin' and status 'active' (same rule as is_admin() in the database). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="text-sm text-muted">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">{admin.full_name}</span>
            <Link href="/home" className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium hover:bg-page">
              Crew view
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
