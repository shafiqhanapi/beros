"use client";

import { useState } from "react";
import type { CrewCatalogue } from "@/lib/crew-catalogue";
import { fmtMoneyShort } from "@/lib/format";

/** Read-only service catalogue for crew: same layout as the admin page, without editing or margins. */
export function ServicesClient({ catalogue }: { catalogue: CrewCatalogue }) {
  const { services, variants } = catalogue;
  const categories = catalogue.categories.filter((c) => services.some((s) => s.category_id === c.id));
  const [catId, setCatId] = useState<string | null>(categories[0]?.id ?? null);
  const [open, setOpen] = useState<Set<string>>(() => new Set(services.filter((s) => s.category_id === categories[0]?.id).slice(0, 1).map((s) => s.id)));

  const category = categories.find((c) => c.id === catId) ?? null;
  const catServices = services.filter((s) => s.category_id === catId);

  if (categories.length === 0) {
    return <p className="rounded-2xl border border-line bg-card px-4 py-8 text-center text-[13px] text-muted">No services listed yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      {/* Categories: a scrolling row on mobile, a card on the right on desktop */}
      <aside className="flex min-w-0 flex-col rounded-2xl border border-line bg-card p-2 md:order-last md:w-[240px] md:shrink-0 md:p-3">
        <span className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.66px] text-muted uppercase">Categories</span>
        <div className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === catId}
              onClick={() => setCatId(c.id)}
              className={`shrink-0 rounded-[10px] px-2 py-2 text-left text-sm whitespace-nowrap md:shrink md:whitespace-normal ${c.id === catId ? "bg-subtle font-semibold text-ink" : "text-muted"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-3">
        {category && (
          <div className="flex items-center gap-3">
            <h2 className="min-w-0 flex-1 text-lg font-bold">{category.name}</h2>
            <span className="shrink-0 text-[13px] text-muted">
              {catServices.length} service{catServices.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {catServices.map((s) => {
          const vs = variants.filter((v) => v.service_id === s.id);
          const from = vs.length ? Math.min(...vs.map((v) => v.price)) : null;
          const isOpen = open.has(s.id);
          return (
            <div key={s.id} className="overflow-hidden rounded-2xl border border-line bg-card">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setOpen((o) => {
                    const n = new Set(o);
                    if (n.has(s.id)) n.delete(s.id);
                    else n.add(s.id);
                    return n;
                  })
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <svg viewBox="0 0 16 16" aria-hidden className={`size-4 shrink-0 text-muted transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}>
                  <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{s.name}</span>
                  <span className="text-xs text-muted">
                    {vs.length} option{vs.length === 1 ? "" : "s"}
                    {from ? ` · from ${fmtMoneyShort(from)}` : ""}
                  </span>
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-line bg-[#fafafa] px-3 py-1 sm:px-4">
                  {s.description && <p className="pt-2 text-[13px] text-muted sm:pl-7">{s.description}</p>}
                  <div className="flex items-center gap-2 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.66px] text-faint uppercase sm:gap-3">
                    <span className="min-w-0 flex-1 sm:pl-7">Option</span>
                    <span className="w-10 text-center sm:w-12">Crew</span>
                    <span className="w-10 text-center sm:w-12">Hrs</span>
                    <span className="w-14 text-center sm:w-16">Price</span>
                  </div>
                  {vs.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 border-t border-line py-2.5 text-sm sm:gap-3">
                      <span className="min-w-0 flex-1 sm:pl-7">{v.name}</span>
                      <span className="w-10 text-center text-[13px] text-muted tabular-nums sm:w-12">{v.crew_count ?? "—"}</span>
                      <span className="w-10 text-center text-[13px] text-muted tabular-nums sm:w-12">{v.duration_hours != null ? `${v.duration_hours}h` : "—"}</span>
                      <span className="w-14 text-center font-semibold sm:w-16">{v.price === 0 ? "Free" : fmtMoneyShort(v.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
