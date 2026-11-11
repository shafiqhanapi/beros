export function Placeholder({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">Coming in {phase}.</p>
      {children}
    </section>
  );
}
