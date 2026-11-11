import { Logo } from "@/components/Logo";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <div className="flex flex-col items-center text-center">
        <Logo className="text-2xl" />
        <p className="mt-4 text-sm text-muted">
          Welcome to the <strong className="text-ink">Crew Portal</strong>. Log hours, submit claims and track your pay.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-card p-6 text-sm">
        {isSupabaseConfigured ? (
          <p className="text-muted">Sign in with email or Google is coming in Phase 2.</p>
        ) : (
          <p className="text-muted">
            The portal isn&apos;t connected to Supabase yet. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        )}
      </section>

      <p className="mt-8 text-center text-sm text-muted">
        New to the crew?{" "}
        <a className="font-medium text-ink underline" href="mailto:hello@beros.online">
          Contact admin
        </a>
      </p>
    </main>
  );
}
