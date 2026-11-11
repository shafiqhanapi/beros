import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { ResendLink } from "./ResendLink";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <AuthShell
      icon="✉"
      title="Check your email"
      backHref="/forgot-password"
      subtitle={
        <>
          We sent a reset link to
          <br />
          {email || "your email"}. It expires in 30 minutes.
        </>
      }
      footer={<ResendLink email={email} />}
    >
      <a href="mailto:" className={btnPrimary}>
        Open email app
      </a>
      <Link href="/login" className={btnSecondary}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}
