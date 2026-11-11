import { Logo } from "@/components/Logo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  auth: "That sign-in link has expired or was already used. Please try again.",
  not_crew: "This account isn't on the BEROS crew list. Please contact admin.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[calc(34px+env(safe-area-inset-bottom))]">
      <div className="flex-1" />
      <div className="flex h-24 items-center justify-center pb-5">
        <Logo size="lg" />
      </div>
      <p className="pb-7 text-center text-[13px] leading-5 text-[#808080]">
        Welcome to the <strong className="font-bold text-[#262626]">Crew Portal</strong>.
        <br />
        Log hours, submit claims and track your pay.
      </p>

      {isSupabaseConfigured ? (
        <LoginForm initialError={error ? ERRORS[error] ?? "Sign-in failed. Please try again." : null} next={next} />
      ) : (
        <div className="rounded-2xl border border-line bg-card px-5 py-6 text-sm text-muted">
          The portal isn&apos;t connected to Supabase yet.
        </div>
      )}

      <div className="flex-1" />
      <div className="flex flex-col items-center gap-1.5 pt-6">
        <p className="text-[13px]">
          <span className="text-muted">New to the crew? </span>
          <a href="mailto:hello@beros.online" className="font-semibold text-ink">
            Contact admin
          </a>
        </p>
        <p className="text-[11px] text-faint">© {new Date().getFullYear()} BEROS Hygiene Care</p>
      </div>
    </main>
  );
}
