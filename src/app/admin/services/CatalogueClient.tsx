"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SidePanel } from "@/components/admin/SidePanel";
import { TableCard, tdClass, thClass } from "@/components/admin/ui";
import { Switch } from "@/components/Switch";
import { ErrorNote } from "@/components/ui";
import type { AddOn, Catalogue, Service, Variant } from "@/lib/catalogue-data";
import { fmtMoney, fmtMoneyShort } from "@/lib/format";
import { deleteCatalogueItem, saveAddOn, saveCategory, saveService, setCatalogueActive } from "../catalogue-actions";

const input = "w-full rounded-[10px] border border-field bg-card px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-ink";
const label = "text-[13px] font-semibold";

type ServicePanel = { service: Service | null; addVariant: boolean } | null;

/** Service catalogue (Figma A7): category › service › variant, plus add-ons. */
export function CatalogueClient({ catalogue }: { catalogue: Catalogue }) {
  const { categories, services, variants, addOns } = catalogue;
  const router = useRouter();
  const [view, setView] = useState<"services" | "addons">("services");
  const [catId, setCatId] = useState<string | null>(categories[0]?.id ?? null);
  const [open, setOpen] = useState<Set<string>>(() => new Set(services.filter((s) => s.category_id === categories[0]?.id).slice(0, 1).map((s) => s.id)));
  const [panel, setPanel] = useState<ServicePanel>(null);
  const [addOnPanel, setAddOnPanel] = useState<AddOn | "new" | null>(null);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [catEdit, setCatEdit] = useState<Catalogue["categories"][number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const category = categories.find((c) => c.id === catId) ?? null;
  const catServices = services.filter((s) => s.category_id === catId);
  const variantsOf = (id: string) => variants.filter((v) => v.service_id === id);

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });

  const toggle = (kind: "category" | "service" | "variant" | "addOn", id: string, active: boolean) => run(() => setCatalogueActive(kind, id, active));

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="hidden text-[13px] font-medium text-muted md:block">Categories, services and variant prices</p>
          <h1 className="text-[22px] font-bold tracking-[-0.52px] md:text-[26px]">{view === "addons" ? "Add-ons" : "Service catalogue"}</h1>
        </div>
        <button
          type="button"
          onClick={() => setView((v) => (v === "addons" ? "services" : "addons"))}
          className="rounded-[10px] border border-strong-line bg-card px-3.5 py-2.5 text-sm font-semibold"
        >
          {view === "addons" ? "Services" : "Add-ons"}
        </button>
        <button
          type="button"
          onClick={() => (view === "addons" ? setAddOnPanel("new") : setPanel({ service: null, addVariant: true }))}
          disabled={view === "services" && categories.length === 0}
          className="rounded-[10px] bg-ink px-3.5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {view === "addons" ? "+ Add-on" : "+ Add service"}
        </button>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {view === "addons" ? (
        <AddOnsTable addOns={addOns} categories={categories} onEdit={setAddOnPanel} onToggle={(id, on) => toggle("addOn", id, on)} busy={pending} />
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* Categories */}
          <aside className="flex flex-col rounded-2xl border border-line bg-card p-2 md:w-[200px] md:shrink-0 md:p-3">
            <div className="flex items-center px-2 pt-1 pb-2">
              <span className="flex-1 text-[11px] font-semibold tracking-[0.66px] text-muted uppercase">Categories</span>
              <button type="button" aria-label="Add category" onClick={() => setNewCat("")} className="px-1 text-lg leading-none font-semibold">
                +
              </button>
            </div>
            <div className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {categories.map((c) => {
                const n = services.filter((s) => s.category_id === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatId(c.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm ${c.id === catId ? "bg-subtle font-semibold text-ink" : "text-muted"} ${c.active ? "" : "line-through opacity-60"}`}
                  >
                    <span className="flex-1 whitespace-nowrap">{c.name}</span>
                    <span className="text-xs text-muted">{n}</span>
                  </button>
                );
              })}
            </div>
            {newCat !== null && (
              <form
                className="mt-2 flex flex-col gap-2 px-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => saveCategory({ name: newCat }), () => setNewCat(null));
                }}
              >
                <input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Upholstery" className={input} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewCat(null)} className="flex-1 rounded-lg border border-strong-line py-1.5 text-xs font-semibold">
                    Cancel
                  </button>
                  <button disabled={!newCat.trim() || pending} className="flex-1 rounded-lg bg-ink py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                    Add
                  </button>
                </div>
              </form>
            )}
            {categories.length === 0 && newCat === null && <p className="px-2 pb-2 text-xs text-muted">No categories yet. Tap + to add one.</p>}
          </aside>

          {/* Services in category */}
          <section className="flex min-w-0 flex-1 flex-col gap-3">
            {category && (
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-bold ${category.active ? "" : "text-muted line-through"}`}>{category.name}</h2>
                <button type="button" onClick={() => setCatEdit(category)} className="rounded-lg border border-strong-line px-3 py-1.5 text-xs font-semibold">
                  Edit
                </button>
                <div className="flex-1" />
                <span className="text-[13px] text-muted">
                  {catServices.length} service{catServices.length === 1 ? "" : "s"}
                </span>
              </div>
            )}

            {category && catServices.length === 0 && (
              <p className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-[13px] text-muted">No services in {category.name} yet. Use “+ Add service”.</p>
            )}

            {catServices.map((s) => {
              const vs = variantsOf(s.id);
              const activeVs = vs.filter((v) => v.active);
              const from = activeVs.length ? Math.min(...activeVs.map((v) => v.price)) : null;
              const isOpen = open.has(s.id);
              return (
                <div key={s.id} className="overflow-hidden rounded-2xl border border-line bg-card">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen((o) => {
                        const n = new Set(o);
                        if (n.has(s.id)) n.delete(s.id);
                        else n.add(s.id);
                        return n;
                      })}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="w-3 text-xs text-muted">{isOpen ? "˅" : "›"}</span>
                      <span className="flex min-w-0 flex-col">
                        <span className={`truncate text-[15px] font-semibold ${s.active ? "" : "text-muted line-through"}`}>{s.name}</span>
                        <span className="text-xs text-muted">
                          {vs.length} variant{vs.length === 1 ? "" : "s"}
                          {from != null ? ` · from ${fmtMoneyShort(from)}` : ""}
                        </span>
                      </span>
                    </button>
                    <Switch on={s.active} label={`${s.name} active`} disabled={pending} onChange={(on) => toggle("service", s.id, on)} />
                    <button type="button" onClick={() => setPanel({ service: s, addVariant: false })} className="rounded-lg border border-strong-line px-3 py-1.5 text-xs font-semibold">
                      Edit
                    </button>
                  </div>
                  {isOpen && (
                    <div className="border-t border-line bg-[#fafafa] px-4 py-1">
                      {vs.map((v) => (
                        <div key={v.id} className="flex items-center gap-3 border-line py-2.5 text-sm [&+&]:border-t">
                          <span className={`min-w-0 flex-1 truncate pl-6 ${v.active ? "" : "text-muted line-through"}`}>{v.name}</span>
                          <span className="w-12 text-right text-[13px] text-muted">{v.duration_hours != null ? `${v.duration_hours}h` : ""}</span>
                          <span className="w-16 text-right font-semibold">{fmtMoneyShort(v.price)}</span>
                          <Switch on={v.active} label={`${s.name} ${v.name} active`} disabled={pending} onChange={(on) => toggle("variant", v.id, on)} />
                        </div>
                      ))}
                      <button type="button" onClick={() => setPanel({ service: s, addVariant: true })} className="py-2.5 pl-6 text-[13px] font-semibold">
                        + Add variant
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-[13px] text-muted">Turning an item off hides it from new bookings. Existing bookings keep the name and price they were booked at.</p>
          </section>
        </div>
      )}

      {panel && (
        <ServiceEditor
          key={panel.service?.id ?? "new"}
          service={panel.service}
          categoryId={panel.service?.category_id ?? catId ?? ""}
          categories={categories}
          variants={panel.service ? variantsOf(panel.service.id) : []}
          addVariant={panel.addVariant}
          onClose={() => setPanel(null)}
          onSaved={(categoryId) => {
            setPanel(null);
            setCatId(categoryId);
            router.refresh();
          }}
        />
      )}
      {catEdit && (
        <CategoryEditor
          key={catEdit.id}
          category={catEdit}
          serviceCount={services.filter((x) => x.category_id === catEdit.id).length}
          onClose={() => setCatEdit(null)}
          onSaved={(deleted) => {
            setCatEdit(null);
            if (deleted) setCatId(categories.find((c) => c.id !== catEdit.id)?.id ?? null);
            router.refresh();
          }}
        />
      )}
      {addOnPanel && (
        <AddOnEditor
          key={addOnPanel === "new" ? "new" : addOnPanel.id}
          addOn={addOnPanel === "new" ? null : addOnPanel}
          categories={categories}
          onClose={() => setAddOnPanel(null)}
          onSaved={() => {
            setAddOnPanel(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function CategoryEditor({
  category,
  serviceCount,
  onClose,
  onSaved,
}: {
  category: Catalogue["categories"][number];
  serviceCount: number;
  onClose: () => void;
  onSaved: (deleted: boolean) => void;
}) {
  const [name, setName] = useState(category.name);
  const [active, setActive] = useState(category.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setError(null);
      if (name.trim() !== category.name) {
        const res = await saveCategory({ id: category.id, name });
        if (res.error) return setError(res.error);
      }
      if (active !== category.active) {
        const res = await setCatalogueActive("category", category.id, active);
        if (res.error) return setError(res.error);
      }
      onSaved(false);
    });

  const remove = () => {
    if (!confirm(`Delete the "${category.name}" category?`)) return;
    start(async () => {
      setError(null);
      const res = await deleteCatalogueItem("category", category.id);
      if (res.error) setError(res.error);
      else onSaved(true);
    });
  };

  return (
    <SidePanel
      title="Edit category"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-[10px] border border-strong-line py-3 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!name.trim() || pending} className="flex-1 rounded-[10px] bg-ink py-3 text-sm font-semibold text-white disabled:bg-strong-line disabled:text-draft">
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <label className="flex flex-col gap-2">
        <span className={label}>Category name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </label>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col">
          <span className={label}>Active</span>
          <span className="text-xs text-muted">Show its services in new bookings</span>
        </div>
        <Switch on={active} onChange={setActive} label="Category active" />
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-col gap-1 border-t border-line pt-4">
        <button type="button" onClick={remove} disabled={pending || serviceCount > 0} className="self-start text-sm font-semibold text-bad disabled:text-faint">
          Delete category
        </button>
        <span className="text-xs text-muted">
          {serviceCount > 0 ? `Delete or move its ${serviceCount} service${serviceCount === 1 ? "" : "s"} first.` : "This can't be undone."}
        </span>
      </div>
    </SidePanel>
  );
}

// ---------------------------------------------------------------------------

type VariantDraft = { id?: string; name: string; price: string; duration: string; active: boolean };

function ServiceEditor({
  service,
  categoryId,
  categories,
  variants,
  addVariant,
  onClose,
  onSaved,
}: {
  service: Service | null;
  categoryId: string;
  categories: Catalogue["categories"];
  variants: Variant[];
  addVariant: boolean;
  onClose: () => void;
  onSaved: (categoryId: string) => void;
}) {
  const blank = (): VariantDraft => ({ name: "", price: "", duration: "", active: true });
  const [name, setName] = useState(service?.name ?? "");
  const [cat, setCat] = useState(categoryId);
  const [description, setDescription] = useState(service?.description ?? "");
  const [active, setActive] = useState(service?.active ?? true);
  const [rows, setRows] = useState<VariantDraft[]>(() => [
    ...variants.map((v) => ({ id: v.id, name: v.name, price: v.price.toFixed(2), duration: v.duration_hours != null ? String(v.duration_hours) : "", active: v.active })),
    ...(addVariant || variants.length === 0 ? [blank()] : []),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const removeVariant = (i: number) => {
    const r = rows[i]!;
    if (!r.id) return setRows((rs) => rs.filter((_, j) => j !== i));
    if (!confirm(`Delete the "${r.name}" variant?`)) return;
    start(async () => {
      setError(null);
      const res = await deleteCatalogueItem("variant", r.id!);
      if (res.error) return setError(res.error);
      setRows((rs) => rs.filter((x) => x.id !== r.id));
      router.refresh();
    });
  };

  const removeService = () => {
    if (!service || !confirm(`Delete "${service.name}" and all its variants?`)) return;
    start(async () => {
      setError(null);
      const res = await deleteCatalogueItem("service", service.id);
      if (res.error) setError(res.error);
      else onSaved(categoryId);
    });
  };

  const filled = rows.filter((r) => r.name.trim());
  const valid = name.trim() && cat && filled.length > 0 && filled.every((r) => r.price !== "" && Number(r.price) >= 0);
  const set = (i: number, patch: Partial<VariantDraft>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveService({
        id: service?.id,
        categoryId: cat,
        name,
        description,
        active,
        variants: filled.map((r) => ({ id: r.id, name: r.name, price: Number(r.price), duration: r.duration === "" ? null : Number(r.duration), active: r.active })),
      });
      if (res.error) setError(res.error);
      else onSaved(cat);
    });

  return (
    <SidePanel
      title={service ? "Edit service" : "Add service"}
      subtitle={service ? undefined : "A service has one or more variants, each with its own price."}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-[10px] border border-strong-line py-3 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!valid || pending} className="flex-1 rounded-[10px] bg-ink py-3 text-sm font-semibold text-white disabled:bg-strong-line disabled:text-draft">
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <label className="flex flex-col gap-2">
        <span className={label}>Service name</span>
        <input autoFocus={!service} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sofa" className={input} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={label}>Category</span>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={input}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className={label}>Description (optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
      </label>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col">
          <span className={label}>Active</span>
          <span className="text-xs text-muted">Show in new bookings</span>
        </div>
        <Switch on={active} onChange={setActive} label="Service active" />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Variants</span>
        <div className="grid grid-cols-[1fr_80px_56px_40px_20px] gap-2 text-[11px] font-semibold tracking-[0.66px] text-muted uppercase">
          <span>Name</span>
          <span>Price</span>
          <span>Hours</span>
          <span>On</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="grid grid-cols-[1fr_80px_56px_40px_20px] items-center gap-2">
            <input value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="e.g. 3-seater" aria-label="Variant name" className={input} />
            <input inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: e.target.value.replace(/[^\d.]/g, "") })} placeholder="$" aria-label="Price" className={input} />
            <input inputMode="decimal" value={r.duration} onChange={(e) => set(i, { duration: e.target.value.replace(/[^\d.]/g, "") })} placeholder="h" aria-label="Estimated hours" className={input} />
            <Switch on={r.active} onChange={(on) => set(i, { active: on })} label={`${r.name || "Variant"} active`} />
            <button type="button" aria-label={`Delete ${r.name || "variant"}`} disabled={pending} onClick={() => removeVariant(i)} className="text-sm text-muted hover:text-bad">
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className="self-start text-[13px] font-semibold">
          + Add variant
        </button>
        <p className="text-xs text-muted">Variants already used in bookings can be switched off but not deleted.</p>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {service && (
        <button type="button" onClick={removeService} disabled={pending} className="self-start border-t border-line pt-4 text-sm font-semibold text-bad">
          Delete service
        </button>
      )}
    </SidePanel>
  );
}

// ---------------------------------------------------------------------------

function AddOnsTable({
  addOns,
  categories,
  onEdit,
  onToggle,
  busy,
}: {
  addOns: AddOn[];
  categories: Catalogue["categories"];
  onEdit: (a: AddOn) => void;
  onToggle: (id: string, on: boolean) => void;
  busy: boolean;
}) {
  const catName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? "—" : "All categories");
  if (addOns.length === 0) return <p className="rounded-2xl border border-line bg-card px-4 py-8 text-center text-[13px] text-muted">No add-ons yet. Use “+ Add-on”.</p>;
  return (
    <TableCard>
      <table className="w-full">
        <thead className="bg-[#fafafa]">
          <tr>
            <th className={thClass}>Add-on</th>
            <th className={`${thClass} hidden md:table-cell`}>Applies to</th>
            <th className={thClass}>Price</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody>
          {addOns.map((a) => (
            <tr key={a.id} className="border-t border-line">
              <td className={tdClass}>
                <p className={`font-semibold ${a.active ? "" : "text-muted line-through"}`}>{a.name}</p>
                <p className="text-xs text-muted md:hidden">{catName(a.category_id)}</p>
              </td>
              <td className={`${tdClass} hidden text-[13px] text-muted md:table-cell`}>{catName(a.category_id)}</td>
              <td className={tdClass}>{fmtMoney(a.price)}</td>
              <td className={tdClass}>
                <span className="flex items-center justify-end gap-3">
                  <Switch on={a.active} label={`${a.name} active`} disabled={busy} onChange={(on) => onToggle(a.id, on)} />
                  <button type="button" onClick={() => onEdit(a)} className="rounded-lg border border-strong-line px-3 py-1.5 text-xs font-semibold">
                    Edit
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

function AddOnEditor({ addOn, categories, onClose, onSaved }: { addOn: AddOn | null; categories: Catalogue["categories"]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(addOn?.name ?? "");
  const [price, setPrice] = useState(addOn ? addOn.price.toFixed(2) : "");
  const [cat, setCat] = useState(addOn?.category_id ?? "");
  const [active, setActive] = useState(addOn?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const valid = name.trim() && price !== "" && Number(price) >= 0;

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveAddOn({ id: addOn?.id, name, price: Number(price), categoryId: cat || null, active });
      if (res.error) setError(res.error);
      else onSaved();
    });

  return (
    <SidePanel
      title={addOn ? "Edit add-on" : "Add add-on"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-[10px] border border-strong-line py-3 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!valid || pending} className="flex-1 rounded-[10px] bg-ink py-3 text-sm font-semibold text-white disabled:bg-strong-line disabled:text-draft">
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <label className="flex flex-col gap-2">
        <span className={label}>Add-on name</span>
        <input autoFocus={!addOn} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Disinfectant spray" className={input} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={label}>Price</span>
        <div className={`${input} flex items-center gap-2`}>
          <span className="text-muted">$</span>
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} className="min-w-0 flex-1 bg-transparent outline-none" />
        </div>
      </label>
      <label className="flex flex-col gap-2">
        <span className={label}>Applies to</span>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={input}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} only
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col">
          <span className={label}>Active</span>
          <span className="text-xs text-muted">Show in new bookings</span>
        </div>
        <Switch on={active} onChange={setActive} label="Add-on active" />
      </div>
      <ErrorNote>{error}</ErrorNote>
      {addOn && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete the "${addOn.name}" add-on?`)) return;
            start(async () => {
              setError(null);
              const res = await deleteCatalogueItem("addOn", addOn.id);
              if (res.error) setError(res.error);
              else onSaved();
            });
          }}
          className="self-start border-t border-line pt-4 text-sm font-semibold text-bad"
        >
          Delete add-on
        </button>
      )}
    </SidePanel>
  );
}
