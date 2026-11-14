import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { NewLinkForm } from "./NewLinkForm";

export const dynamic = "force-dynamic";

/** Shown when an invite or reset link has expired (they last 24 hours) or was already used. */
export default async function LinkExpiredPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const invite = type === "invite";
  return (
    <AuthShell
      icon="⏱"
      title="This link has expired"
      subtitle={
        invite
          ? "Invite links work once and last 24 hours. Enter your email and we’ll send you a new link to set up your account."
          : "Links work once and last 24 hours. Enter your email and we’ll send you a new one."
      }
      footer={
        <>
          <span className="text-muted">Already set up?</span>
          <Link href="/login" className="font-semibold">
            Sign in
          </Link>
        </>
      }
    >
      <NewLinkForm />
    </AuthShell>
  );
}
