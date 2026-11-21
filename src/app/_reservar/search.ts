import { z } from "zod";
import { parseLocalDate, type LocalDate } from "@/shared/kernel";

/** Lo que la página entiende de la dirección. Cualquier otra cosa se ignora (S-6). */
export type BookingSearch = { servicio?: string; dia?: LocalDate; semana?: LocalDate };

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const slug = z.string().regex(/^[a-z0-9-]{1,60}$/);
const date = z.string().transform((s, ctx) => parseLocalDate(s) ?? (ctx.addIssue({ code: "custom" }), z.NEVER));

export function parseBookingSearch(raw: Record<string, string | string[] | undefined>): BookingSearch {
  const out: BookingSearch = {};
  const servicio = slug.safeParse(first(raw.servicio));
  if (servicio.success) out.servicio = servicio.data;
  const dia = date.safeParse(first(raw.dia));
  if (dia.success) out.dia = dia.data;
  const semana = date.safeParse(first(raw.semana));
  if (semana.success) out.semana = semana.data;
  return out;
}

/** Dirección de la página con la selección dada. */
export function bookingHref(search: BookingSearch): string {
  const params = new URLSearchParams();
  if (search.servicio) params.set("servicio", search.servicio);
  if (search.dia) params.set("dia", search.dia);
  if (search.semana) params.set("semana", search.semana);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
