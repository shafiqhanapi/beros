import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { monthTsRange } from "@/lib/format";
import { num } from "@/lib/types";

/** Service catalogue and bookings (SPEC.md "Run first" SQL block), read as an admin. */

export interface Category {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}
export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
}
export interface Variant {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration_hours: number | null;
  active: boolean;
  sort_order: number;
}
export interface AddOn {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
}
export interface Catalogue {
  categories: Category[];
  services: Service[];
  variants: Variant[];
  addOns: AddOn[];
}

export type BookingSource = "app" | "whatsapp" | "phone" | "walk_in" | "other";
export type BookingStatus = "scheduled" | "completed" | "cancelled";

export interface AdminBooking {
  id: string;
  ref: string | null;
  scheduled_at: string;
  customer_name: string;
  customer_phone: string | null;
  address: string;
  postal_code: string | null;
  notes: string | null;
  source: BookingSource;
  status: BookingStatus;
  items_total: number;
  add_ons_total: number;
  total: number;
  title: string;
  items: { label: string; quantity: number; unit_price: number; line_total: number }[];
  addOns: { name: string; quantity: number; unit_price: number }[];
  crewIds: string[];
}

const db = cache(async () => {
  await requireAdmin();
  return createClient();
});

const byOrder = <T extends { sort_order: number; name: string }>(a: T, b: T) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

export const getCatalogue = cache(async (): Promise<Catalogue> => {
  const supabase = await db();
  const [c, s, v, a] = await Promise.all([
    supabase.from("service_categories").select("*"),
    supabase.from("services").select("*"),
    supabase.from("service_variants").select("*"),
    supabase.from("add_ons").select("*"),
  ]);
  const err = c.error ?? s.error ?? v.error ?? a.error;
  if (err) throw new Error(err.message);
  return {
    categories: (c.data as Category[]).sort(byOrder),
    services: (s.data as Service[]).sort(byOrder),
    variants: (v.data as Variant[])
      .map((x) => ({ ...x, price: num(x.price), duration_hours: x.duration_hours == null ? null : num(x.duration_hours) }))
      .sort((x, y) => x.sort_order - y.sort_order || x.price - y.price),
    addOns: (a.data as AddOn[]).map((x) => ({ ...x, price: num(x.price) })).sort(byOrder),
  };
});

export async function getBookingsForMonth(month: string): Promise<AdminBooking[]> {
  const supabase = await db();
  const { start, end } = monthTsRange(month);
  const { data, error } = await supabase
    .from("bookings")
    .select("*, booking_items(item_label, quantity, unit_price, line_total), booking_add_ons(quantity, unit_price, add_ons(name)), booking_crew(crew_id)")
    .gte("scheduled_at", start)
    .lt("scheduled_at", end)
    .order("scheduled_at");
  if (error) throw new Error(error.message);

  type Row = Omit<AdminBooking, "title" | "items" | "addOns" | "crewIds"> & {
    booking_items: { item_label: string; quantity: number; unit_price: number; line_total: number }[];
    booking_add_ons: { quantity: number; unit_price: number; add_ons: { name: string } | { name: string }[] | null }[];
    booking_crew: { crew_id: string }[];
  };
  return ((data ?? []) as Row[]).map(({ booking_items, booking_add_ons, booking_crew, ...b }) => {
    const items = booking_items.map((i) => ({ label: i.item_label, quantity: i.quantity, unit_price: num(i.unit_price), line_total: num(i.line_total) }));
    const services = [...new Set(items.map((i) => i.label.split(" · ")[0]!.trim()))];
    return {
      ...b,
      items_total: num(b.items_total),
      add_ons_total: num(b.add_ons_total),
      total: num(b.total),
      title: services.join(", ") || "Booking",
      items,
      addOns: booking_add_ons.map((a) => ({
        name: (Array.isArray(a.add_ons) ? a.add_ons[0]?.name : a.add_ons?.name) ?? "Add-on",
        quantity: a.quantity,
        unit_price: num(a.unit_price),
      })),
      crewIds: booking_crew.map((c) => c.crew_id),
    };
  });
}
