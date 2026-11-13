"use client";

import { useMemo, useState, useTransition } from "react";
import { SidePanel } from "@/components/admin/SidePanel";
import { Avatar } from "@/components/admin/ui";
import { ErrorNote } from "@/components/ui";
import type { BookingSource, Catalogue } from "@/lib/catalogue-data";
import { fmtMoney, fmtPhone, phoneDigits } from "@/lib/format";
import { createBooking } from "../catalogue-actions";
import type { CrewOption } from "./BookingsClient";

type Line = { key: number; variantId: string; quantity: number };

const input = "w-full rounded-[10px] border border-field bg-card px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-ink";
const label = "text-[13px] font-semibold";

const SOURCES: { value: BookingSource; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk-in" },
  { value: "app", label: "BEROS app" },
  { value: "other", label: "Other" },
];

/** "+ New booking" side panel (Figma A6b): items, date/time, customer, source, add-ons, optional crew. */
export function NewBookingPanel({
  catalogue,
  crew,
  today,
  onClose,
  onCreated,
}: {
  catalogue: Catalogue;
  crew: CrewOption[];
  today: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { categories, services, variants, addOns } = catalogue;
  const activeCats = categories.filter((c) => c.active);
  const activeServices = services.filter((s) => s.active);
  const activeVariants = variants.filter((v) => v.active);

  const variantInfo = useMemo(() => {
    const m = new Map<string, { label: string; price: number; categoryId: string }>();
    for (const v of variants) {
      const s = services.find((x) => x.id === v.service_id);
      if (s) m.set(v.id, { label: `${s.name} · ${v.name}`, price: v.price, categoryId: s.category_id });
    }
    return m;
  }, [variants, services]);

  const [lines, setLines] = useState<Line[]>([]);
  const [picker, setPicker] = useState({ categoryId: "", serviceId: "", variantId: "" });
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");
  const [source, setSource] = useState<BookingSource>("whatsapp");
  const [notes, setNotes] = useState("");
  const [addOnQty, setAddOnQty] = useState<Record<string, number>>({});
  const [crewIds, setCrewIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const lineCats = new Set(lines.map((l) => variantInfo.get(l.variantId)?.categoryId));
  const availableAddOns = addOns.filter((a) => a.active && (!a.category_id || lineCats.has(a.category_id)));
  const itemsTotal = lines.reduce((s, l) => s + (variantInfo.get(l.variantId)?.price ?? 0) * l.quantity, 0);
  const addOnsTotal = availableAddOns.reduce((s, a) => s + (addOnQty[a.id] ?? 0) * a.price, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  const phoneOk = !phone || /^[689]\d{7}$/.test(phone);
  const postalOk = !postal || /^\d{6}$/.test(postal);
  const valid = lines.length > 0 && customer.trim() && address.trim() && date && time && phoneOk && postalOk;

  const addLine = () => {
    if (!picker.variantId) return;
    setLines((ls) => {
      const existing = ls.find((l) => l.variantId === picker.variantId);
      if (existing) return ls.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { key: Date.now(), variantId: picker.variantId, quantity: 1 }];
    });
    setPicker((p) => ({ ...p, variantId: "" }));
  };

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await createBooking({
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        addOns: availableAddOns.filter((a) => (addOnQty[a.id] ?? 0) > 0).map((a) => ({ addOnId: a.id, quantity: addOnQty[a.id]! })),
        date,
        time,
        customerName: customer,
        customerPhone: phone,
        address,
        postalCode: postal,
        source,
        notes,
        crewIds,
      });
      if (res.error) setError(res.error);
      else onCreated();
    });

  const servicesInCat = activeServices.filter((s) => s.category_id === picker.categoryId);
  const variantsInService = activeVariants.filter((v) => v.service_id === picker.serviceId);

  return (
    <SidePanel
      title="New booking"
      subtitle="For jobs that came in outside the BEROS app."
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col gap-3">
          <div className="-mx-6 -mt-4 flex items-center bg-page px-6 py-3">
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] text-muted">Booking total</span>
              <span className="text-xs text-muted">
                {itemCount} item{itemCount === 1 ? "" : "s"} {fmtMoney(itemsTotal)}
                {addOnsTotal ? ` + add-ons ${fmtMoney(addOnsTotal)}` : ""}
              </span>
            </div>
            <span className="text-xl font-bold">{fmtMoney(itemsTotal + addOnsTotal)}</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-[10px] border border-strong-line py-3 text-sm font-semibold">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={!valid || pending} className="flex-1 rounded-[10px] bg-ink py-3 text-sm font-semibold text-white disabled:bg-strong-line disabled:text-draft">
              {pending ? "Creating…" : "Create booking"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <span className={label}>Items</span>
        <div className="flex flex-col rounded-xl border border-field">
          {lines.map((l) => {
            const info = variantInfo.get(l.variantId);
            return (
              <div key={l.key} className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{info?.label}</span>
                <span className="flex items-center gap-1 rounded-md bg-subtle px-1">
                  <button type="button" aria-label="Fewer" onClick={() => setLines((ls) => ls.map((x) => (x === l ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))} className="px-1.5 text-muted">
                    −
                  </button>
                  <span className="w-4 text-center font-semibold">{l.quantity}</span>
                  <button type="button" aria-label="More" onClick={() => setLines((ls) => ls.map((x) => (x === l ? { ...x, quantity: x.quantity + 1 } : x)))} className="px-1.5 text-muted">
                    +
                  </button>
                </span>
                <span className="w-16 text-right font-semibold">{fmtMoney((info?.price ?? 0) * l.quantity)}</span>
                <button type="button" aria-label="Remove item" onClick={() => setLines((ls) => ls.filter((x) => x !== l))} className="px-1 text-muted">
                  ✕
                </button>
              </div>
            );
          })}
          <div className="flex flex-col gap-2 p-3">
            <div className="grid grid-cols-3 gap-2">
              <select aria-label="Category" value={picker.categoryId} onChange={(e) => setPicker({ categoryId: e.target.value, serviceId: "", variantId: "" })} className={input}>
                <option value="">Category</option>
                {activeCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select aria-label="Service" value={picker.serviceId} disabled={!picker.categoryId} onChange={(e) => setPicker((p) => ({ ...p, serviceId: e.target.value, variantId: "" }))} className={input}>
                <option value="">Service</option>
                {servicesInCat.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select aria-label="Variant" value={picker.variantId} disabled={!picker.serviceId} onChange={(e) => setPicker((p) => ({ ...p, variantId: e.target.value }))} className={input}>
                <option value="">Variant</option>
                {variantsInService.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {fmtMoney(v.price)}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={addLine} disabled={!picker.variantId} className="self-start text-sm font-semibold disabled:text-faint">
              + Add item
            </button>
            {activeCats.length === 0 && <p className="text-xs text-muted">The service catalogue is empty. Add services under Services first.</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-2">
          <span className={label}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>
        <label className="flex flex-1 flex-col gap-2">
          <span className={label}>Time</span>
          <input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} className={input} />
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={label}>Customer name</span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Mdm Tan" className={input} />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={label}>Customer mobile</span>
          <div className={`${input} flex items-center gap-2 ${phoneOk ? "" : "border-bad"}`}>
            <span className="text-muted">+65</span>
            <input
              type="tel"
              inputMode="numeric"
              value={fmtPhone(phone)}
              onChange={(e) => setPhone(phoneDigits(e.target.value))}
              placeholder="8 digits"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
            />
          </div>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={label}>Address</span>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Block, street, unit" className={input} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-2">
          <span className={label}>Postal code</span>
          <input
            inputMode="numeric"
            value={postal}
            onChange={(e) => setPostal(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6 digits"
            className={`${input} ${postalOk ? "" : "border-bad"}`}
          />
        </label>
        <label className="flex flex-1 flex-col gap-2">
          <span className={label}>Source</span>
          <select value={source} onChange={(e) => setSource(e.target.value as BookingSource)} className={input}>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={label}>Notes (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Bring extra vacuum" className={input} />
      </label>

      {availableAddOns.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={label}>Add-ons (optional)</span>
          <div className="flex flex-col rounded-xl border border-field px-3">
            {availableAddOns.map((a) => {
              const q = addOnQty[a.id] ?? 0;
              return (
                <div key={a.id} className="flex items-center gap-2 border-line py-2.5 text-sm [&+&]:border-t">
                  <input type="checkbox" checked={q > 0} onChange={() => setAddOnQty((m) => ({ ...m, [a.id]: q > 0 ? 0 : 1 }))} className="size-4 accent-ink" aria-label={a.name} />
                  <span className="flex-1">{a.name}</span>
                  {q > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-subtle px-1">
                      <button type="button" aria-label="Fewer" onClick={() => setAddOnQty((m) => ({ ...m, [a.id]: Math.max(1, q - 1) }))} className="px-1.5 text-muted">
                        −
                      </button>
                      <span className="w-4 text-center font-semibold">{q}</span>
                      <button type="button" aria-label="More" onClick={() => setAddOnQty((m) => ({ ...m, [a.id]: q + 1 }))} className="px-1.5 text-muted">
                        +
                      </button>
                    </span>
                  )}
                  <span className="w-16 text-right text-muted">{fmtMoney(a.price * Math.max(q, 1))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {crew.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={label}>Crew (optional)</span>
          <div className="flex flex-wrap gap-2">
            {crew.map((c) => {
              const on = crewIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCrewIds((ids) => (on ? ids.filter((x) => x !== c.id) : [...ids, c.id]))}
                  className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] font-medium ${on ? "border-ink bg-ink text-white" : "border-line bg-card"}`}
                >
                  <Avatar name={c.name} size={22} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>
    </SidePanel>
  );
}
