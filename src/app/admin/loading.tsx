/** Shown instantly while an admin screen loads. */
export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-[#e9e9e9]";
  return (
    <main aria-busy aria-label="Loading" className="flex flex-col gap-6 px-6 pt-8 md:px-10">
      <div className={`${bar} h-8 w-56`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${bar} h-24 rounded-2xl`} />
        ))}
      </div>
      <div className={`${bar} h-64 rounded-2xl`} />
    </main>
  );
}
