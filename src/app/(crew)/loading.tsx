/** Shown instantly while a crew screen loads, so taps never feel unresponsive. */
export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-[#e9e9e9]";
  return (
    <main
      aria-busy
      aria-label="Loading"
      className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-6 pt-[calc(24px+env(safe-area-inset-top))] md:max-w-[720px] md:px-10 md:pt-10"
    >
      <div className={`${bar} h-7 w-40`} />
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
        <div className={`${bar} h-4 w-24`} />
        <div className={`${bar} h-8 w-36`} />
        <div className="flex gap-6 border-t border-line pt-4">
          <div className={`${bar} h-9 flex-1`} />
          <div className={`${bar} h-9 flex-1`} />
          <div className={`${bar} h-9 flex-1`} />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <div className={`${bar} h-10`} />
        <div className={`${bar} h-10`} />
        <div className={`${bar} h-10`} />
      </div>
    </main>
  );
}
