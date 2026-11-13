"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { BookingSource, BookingStatus } from "@/lib/catalogue-data";

/** Admin actions for bookings and the service catalogue (RLS: is_admin()). */

export type ActionResult = { error?: string; ok?: string };
const fail = (error: string): ActionResult => ({ error });

async function db() {
  await requireAdmin();
  return createClient();
}

const friendly = (msg: string) =>
  /duplicate key|unique/i.test(msg) ? "That name is already used here. Pick a different name." : msg;

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

/** Replace a booking's crew with exactly `crewIds`. Assigned crew see it under "To log". */
export async function saveAssignment(bookingId: string, crewIds: string[]): Promise<ActionResult> {
  const supabase = await db();
  const { data: current, error } = await supabase.from("booking_crew").select("crew_id").eq("booking_id", bookingId);
  if (error) return fail(error.message);
  const before = new Set((current ?? []).map((r) => r.crew_id as string));
  const after = new Set(crewIds);
  const remove = [...before].filter((id) => !after.has(id));
  const add = [...after].filter((id) => !before.has(id));
  if (remove.length) {
    const { error: e } = await supabase.from("booking_crew").delete().eq("booking_id", bookingId).in("crew_id", remove);
    if (e) return fail(e.message);
  }
  if (add.length) {
    const { error: e } = await supabase.from("booking_crew").insert(add.map((crew_id) => ({ booking_id: bookingId, crew_id })));
    if (e) return fail(e.message);
  }
  revalidatePath("/admin/bookings");
  return { ok: "Assignment saved" };
}

export async function setBookingStatus(bookingId: string, status: BookingStatus): Promise<ActionResult> {
  if (!["scheduled", "completed", "cancelled"].includes(status)) return fail("Unknown status.");
  const supabase = await db();
  const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
  if (error) return fail(error.message);
  revalidatePath("/admin/bookings");
  return {};
}

export interface NewBookingInput {
  items: { variantId: string; quantity: number }[];
  addOns: { addOnId: string; quantity: number }[];
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, Singapore time
  customerName: string;
  customerPhone: string;
  address: string;
  postalCode: string;
  source: BookingSource;
  notes: string;
  crewIds: string[];
}

const SOURCES: BookingSource[] = ["app", "whatsapp", "phone", "walk_in", "other"];

/**
 * Create a booking by hand. Names and prices are read from the catalogue here
 * and copied onto the booking, so later price changes never alter it.
 * Totals are kept in sync by the sync_booking_totals() trigger.
 */
export async function createBooking(input: NewBookingInput): Promise<ActionResult> {
  const items = input.items.filter((i) => i.variantId && i.quantity > 0);
  if (!items.length) return fail("Add at least one item.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return fail("Pick a date and time.");
  if (!input.customerName.trim()) return fail("Enter the customer's name.");
  if (input.customerPhone && !/^[689]\d{7}$/.test(input.customerPhone)) return fail("Enter an 8-digit Singapore number, or leave it blank.");
  if (!input.address.trim()) return fail("Enter the address.");
  if (input.postalCode && !/^\d{6}$/.test(input.postalCode)) return fail("Postal code must be 6 digits.");
  if (!SOURCES.includes(input.source)) return fail("Pick a source.");

  const supabase = await db();
  const variantIds = [...new Set(items.map((i) => i.variantId))];
  const { data: variants, error: vErr } = await supabase
    .from("service_variants")
    .select("id, name, price, active, services(name)")
    .in("id", variantIds);
  if (vErr) return fail(vErr.message);
  const vmap = new Map(
    (variants ?? []).map((v) => {
      const svc = Array.isArray(v.services) ? v.services[0] : (v.services as { name: string } | null);
      return [v.id as string, { label: `${svc?.name ?? "Service"} · ${v.name}`, price: Number(v.price), active: v.active as boolean }];
    }),
  );
  if (items.some((i) => !vmap.get(i.variantId)?.active)) return fail("One of the items is no longer offered. Remove it and pick again.");

  const addOns = input.addOns.filter((a) => a.addOnId && a.quantity > 0);
  const { data: addOnRows } = addOns.length
    ? await supabase.from("add_ons").select("id, price, active").in("id", addOns.map((a) => a.addOnId))
    : { data: [] as { id: string; price: number; active: boolean }[] };
  const amap = new Map((addOnRows ?? []).map((a) => [a.id as string, { price: Number(a.price), active: a.active as boolean }]));
  if (addOns.some((a) => !amap.get(a.addOnId)?.active)) return fail("One of the add-ons is no longer offered.");

  const me = await requireAdmin();
  let bookingId: string | null = null;
  for (let attempt = 0; attempt < 4 && !bookingId; attempt++) {
    const ref = `BK-${input.date.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        ref,
        scheduled_at: `${input.date}T${input.time}:00+08:00`,
        customer_name: input.customerName.trim(),
        customer_phone: input.customerPhone || null,
        address: input.address.trim(),
        postal_code: input.postalCode || null,
        notes: input.notes.trim() || null,
        source: input.source,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (data) bookingId = data.id as string;
    else if (error && !/duplicate key|unique/i.test(error.message)) return fail(error.message);
  }
  if (!bookingId) return fail("Couldn't create a booking reference. Try again.");

  // Merge repeated variants into one line.
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + Math.round(i.quantity));
  const { error: iErr } = await supabase.from("booking_items").insert(
    [...merged].map(([variantId, quantity]) => ({
      booking_id: bookingId,
      variant_id: variantId,
      item_label: vmap.get(variantId)!.label,
      quantity,
      unit_price: vmap.get(variantId)!.price,
    })),
  );
  if (iErr) {
    await supabase.from("bookings").delete().eq("id", bookingId);
    return fail(iErr.message);
  }
  if (addOns.length) {
    const { error: aErr } = await supabase
      .from("booking_add_ons")
      .insert(addOns.map((a) => ({ booking_id: bookingId, add_on_id: a.addOnId, quantity: Math.round(a.quantity), unit_price: amap.get(a.addOnId)!.price })));
    if (aErr) return fail(`Booking created, but add-ons failed: ${aErr.message}`);
  }
  if (input.crewIds.length) {
    const { error: cErr } = await supabase.from("booking_crew").insert(input.crewIds.map((crew_id) => ({ booking_id: bookingId, crew_id })));
    if (cErr) return fail(`Booking created, but crew assignment failed: ${cErr.message}`);
  }
  revalidatePath("/admin/bookings");
  return { ok: "Booking created" };
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

const TABLES = { category: "service_categories", service: "services", variant: "service_variants", addOn: "add_ons" } as const;

/** Turn any catalogue item on or off. Off hides it from new bookings only. */
export async function setCatalogueActive(kind: keyof typeof TABLES, id: string, active: boolean): Promise<ActionResult> {
  const supabase = await db();
  const { error } = await supabase.from(TABLES[kind]).update({ active }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/services");
  return {};
}

export async function saveCategory(input: { id?: string; name: string }): Promise<ActionResult> {
  if (!input.name.trim()) return fail("Enter a category name.");
  const supabase = await db();
  const { error } = input.id
    ? await supabase.from("service_categories").update({ name: input.name.trim() }).eq("id", input.id)
    : await supabase.from("service_categories").insert({ name: input.name.trim() });
  if (error) return fail(friendly(error.message));
  revalidatePath("/admin/services");
  return {};
}

export interface ServiceInput {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  active: boolean;
  variants: { id?: string; name: string; price: number; duration: number | null; active: boolean }[];
}

/** Create or update a service together with its variants. */
export async function saveService(input: ServiceInput): Promise<ActionResult> {
  if (!input.name.trim()) return fail("Enter a service name.");
  if (!input.categoryId) return fail("Pick a category.");
  const variants = input.variants.filter((v) => v.name.trim());
  if (!variants.length) return fail("Add at least one variant with a price.");
  if (variants.some((v) => !(Number(v.price) >= 0) || Number.isNaN(Number(v.price)))) return fail("Every variant needs a price.");
  if (new Set(variants.map((v) => v.name.trim().toLowerCase())).size !== variants.length) return fail("Variant names must be different.");

  const supabase = await db();
  const row = { category_id: input.categoryId, name: input.name.trim(), description: input.description.trim() || null, active: input.active };
  let serviceId = input.id;
  if (serviceId) {
    const { error } = await supabase.from("services").update(row).eq("id", serviceId);
    if (error) return fail(friendly(error.message));
  } else {
    const { data, error } = await supabase.from("services").insert(row).select("id").single();
    if (error || !data) return fail(friendly(error?.message ?? "Couldn't create the service."));
    serviceId = data.id as string;
  }

  for (const [i, v] of variants.entries()) {
    const vrow = {
      service_id: serviceId,
      name: v.name.trim(),
      price: Math.round(Number(v.price) * 100) / 100,
      duration_hours: v.duration == null || Number.isNaN(Number(v.duration)) ? null : Math.round(Number(v.duration) * 10) / 10,
      active: v.active,
      sort_order: i,
    };
    const { error } = v.id ? await supabase.from("service_variants").update(vrow).eq("id", v.id) : await supabase.from("service_variants").insert(vrow);
    if (error) return fail(friendly(error.message));
  }
  revalidatePath("/admin/services");
  return { ok: "Saved" };
}

export async function saveAddOn(input: { id?: string; name: string; price: number; categoryId: string | null; active: boolean }): Promise<ActionResult> {
  if (!input.name.trim()) return fail("Enter an add-on name.");
  if (!(Number(input.price) >= 0)) return fail("Enter a price.");
  const supabase = await db();
  const row = { name: input.name.trim(), price: Math.round(Number(input.price) * 100) / 100, category_id: input.categoryId || null, active: input.active };
  const { error } = input.id ? await supabase.from("add_ons").update(row).eq("id", input.id) : await supabase.from("add_ons").insert(row);
  if (error) return fail(friendly(error.message));
  revalidatePath("/admin/services");
  return {};
}

/**
 * Delete a catalogue item. Postgres refuses (foreign key) when bookings or
 * other items still use it; we turn that into a plain message. Deleting a
 * service also deletes its variants (ON DELETE CASCADE), unless a booking
 * uses one of them.
 */
export async function deleteCatalogueItem(kind: keyof typeof TABLES, id: string): Promise<ActionResult> {
  const supabase = await db();
  if (kind === "category") {
    const { count } = await supabase.from("services").select("id", { count: "exact", head: true }).eq("category_id", id);
    if (count) return fail("This category still has services. Delete or move them first.");
  }
  const { error, count } = await supabase.from(TABLES[kind]).delete({ count: "exact" }).eq("id", id);
  if (error) {
    if (error.code === "23503" || /foreign key/i.test(error.message)) {
      return fail(
        kind === "category"
          ? "Add-ons are limited to this category. Change or delete those add-ons first, or switch the category off instead."
          : "This is used in past bookings, so it can't be deleted. Switch it off instead to hide it from new bookings.",
      );
    }
    return fail(error.message);
  }
  if (!count) return fail("Nothing was deleted. It may already be gone.");
  revalidatePath("/admin/services");
  return { ok: "Deleted" };
}
