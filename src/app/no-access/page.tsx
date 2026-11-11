import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { getSession, homeFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Signed in, but not an active member of the crew list. */
export default async function NoAccessPage() {
  const session = await getSession();
  if (session.state === "signed_out" || session.state === "ok") redirect(homeFor(session));

  const message =
    session.state === "inactive"
      ? "Your crew account has been deactivated."
      : `${session.email ?? "This account"} isn't on the BEROS crew list.`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo className="text-2xl" />
      <section className="w-full rounded-2xl border border-line bg-card p-6 text-sm">
        <p className="font-medium">{message}</p>
        <p className="mt-2 text-muted">
          Please{" "}
          <a className="font-medium text-ink underline" href="mailto:hello@beros.online">
            contact admin
          </a>{" "}
          if you think this is a mistake.
        </p>
      </section>
      <SignOutButton />
    </main>
  );
}
