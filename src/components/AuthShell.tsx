import Link from "next/link";

/** Layout for Forgot password, Check your email and Set new password (Figma 01b–01d). */
export function AuthShell({
  icon,
  title,
  subtitle,
  backHref = "/login",
  footer,
  children,
}: {
  icon: string;
  title: string;
  subtitle: React.ReactNode;
  backHref?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[calc(34px+env(safe-area-inset-bottom))] md:pt-10">
      <div className="flex items-center">
        <Link
          href={backHref}
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-xl border border-line bg-card text-base font-semibold"
        >
          ←
        </Link>
      </div>
      <div className="flex-1" />
      <div className="flex flex-col items-center gap-2.5 pb-7 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border border-line bg-card text-[22px] font-semibold">
          {icon}
        </div>
        <h1 className="text-[22px] font-bold">{title}</h1>
        <p className="text-sm leading-[21px] text-muted">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card px-5 py-6">{children}</div>
      <div className="flex-1" />
      {footer && <div className="flex items-center justify-center gap-1 pt-6 text-[13px]">{footer}</div>}
    </main>
  );
}
