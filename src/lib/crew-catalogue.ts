import "server-only";
import { cache } from "react";
import { requireCrew } from "@/lib/auth";
import { adminClient, hasServiceRole } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/types";

/** Read-only service catalogue for crew: active items only, no costs or margins. */
export interface CrewCatalogue {
  categories: { id: string; name: string }[];
  services: { id: string; category_id: string; name: string; description: string | null }[];
  variants: { id: string; service_id: string; name: string; price: number; duration_hours: number | null; crew_count: number | null }[];
}

type Row = { id: string; name: string; active: boolean; sort_order: number };
const byOrder = <T extends { sort_order: number; name: string }>(a: T, b: T) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

export const getCrewCatalogue = cache(async (): Promise<CrewCatalogue> => {
  await requireCrew();
  const supabase = await createClient();
  const [c, s, v] = await Promise.all([
    supabase.from("service_categories").select("id, name, active, sort_order").eq("active", true),
    supabase.from("services").select("id, category_id, name, description, active, sort_order").eq("active", true),
    supabase.from("service_variants").select("id, service_id, name, price, duration_hours, active, sort_order").eq("active", true),
  ]);
  const err = c.error ?? s.error ?? v.error;
  if (err) throw new Error(err.message);

  // Crew numbers live in the admin-only costs table. Read just that column on
  // the server; cost per job never leaves the server for crew.
  const crewBy = new Map<string, number | null>();
  if (hasServiceRole) {
    const { data } = await adminClient().from("service_variant_costs").select("variant_id, crew_count");
    for (const r of (data ?? []) as { variant_id: string; crew_count: number | null }[]) crewBy.set(r.variant_id, r.crew_count);
  }

  const categories = (c.data as Row[]).sort(byOrder);
  const catIds = new Set(categories.map((x) => x.id));
  const services = (s.data as (Row & { category_id: string; description: string | null })[]).filter((x) => catIds.has(x.category_id)).sort(byOrder);
  const svcIds = new Set(services.map((x) => x.id));
  const variants = (v.data as (Row & { service_id: string; price: unknown; duration_hours: unknown })[])
    .filter((x) => svcIds.has(x.service_id))
    .sort((a, b) => a.sort_order - b.sort_order || num(a.price as number) - num(b.price as number));

  return {
    categories: categories.map(({ id, name }) => ({ id, name })),
    services: services.filter((x) => variants.some((y) => y.service_id === x.id)).map(({ id, category_id, name, description }) => ({ id, category_id, name, description })),
    variants: variants.map((x) => ({
      id: x.id,
      service_id: x.service_id,
      name: x.name,
      price: num(x.price as number),
      duration_hours: x.duration_hours == null ? null : num(x.duration_hours as number),
      crew_count: crewBy.get(x.id) ?? null,
    })),
  };
});
