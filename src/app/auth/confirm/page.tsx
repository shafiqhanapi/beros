import { AuthShell } from "@/components/AuthShell";
import { btnPrimary } from "@/components/ui";
import { safePath } from "@/lib/safe-path";
import { confirmLink } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Landing page for links in Supabase emails (invite and reset password).
 * Templates link here with ?token_hash=…&type=invite|recovery&next=/reset-password.
 * Nothing happens until the person taps Continue (see confirmLink).
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const type = sp.type ?? "";
  const invite = type === "invite";
  return (
    <AuthShell
      icon={invite ? "👋" : "•••"}
      title={invite ? "Welcome to the crew" : "Reset your password"}
      subtitle={invite ? "Tap continue to set up your account and choose a password." : "Tap continue to choose a new password."}
    >
      {sp.token_hash ? (
        <form action={confirmLink} className="flex flex-col">
          <input type="hidden" name="token_hash" value={sp.token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={safePath(sp.next, "/reset-password")} />
          <button className={btnPrimary}>{invite ? "Set up my account" : "Continue"}</button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          This link is incomplete. <a href="/auth/link-expired" className="font-semibold text-ink underline">Get a new link</a>.
        </p>
      )}
    </AuthShell>
  );
}
