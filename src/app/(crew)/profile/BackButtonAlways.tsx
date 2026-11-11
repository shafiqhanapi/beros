import Link from "next/link";

/** Back to Profile; shown on desktop too, since edit screens aren't in the sidebar. */
export function BackButtonAlways() {
  return (
    <Link
      href="/profile"
      aria-label="Back to profile"
      className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-base font-semibold"
    >
      ←
    </Link>
  );
}
