import { err, ok, type Result } from "@/shared/kernel";

/** Servicio con turno (D-10): Corte, Completo, Claritos… */
export type Service = {
  id: string;
  /** Para la dirección de la página: "corte", "completo", "claritos". */
  slug: string;
  name: string;
  /** Qué incluye, en palabras del cliente ("Corte, barba y cejas"). */
  description: string;
  durationMinutes: number;
  /** Precio en centavos enteros. */
  priceCents: number;
  /** Si suma para visitas y descuentos (solo Corte y Completo). */
  countsForBenefits: boolean;
  /** Orden en que se muestra. */
  position: number;
};

/** Lo que hace falta para validar un servicio nuevo o editado. */
export type ServiceDraft = Pick<Service, "name" | "priceCents" | "durationMinutes">;

export type ServiceError = "PRICE_NOT_POSITIVE" | "DURATION_NOT_MULTIPLE_OF_STEP" | "NAME_TAKEN";

/** Forma de comparar nombres: igual que el índice único de la base, `lower(trim(name))`. */
export const normalizeServiceName = (name: string) => name.trim().toLowerCase();

/**
 * RF-13: precio positivo, duración múltiplo del paso y nombre distinto de los demás servicios activos.
 * `otherActiveNames` no incluye al servicio que se está editando.
 */
export function validateService(
  draft: ServiceDraft,
  stepMinutes: number,
  otherActiveNames: string[],
): Result<void, ServiceError[]> {
  const errors: ServiceError[] = [];
  if (!Number.isInteger(draft.priceCents) || draft.priceCents <= 0) errors.push("PRICE_NOT_POSITIVE");
  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes <= 0 || draft.durationMinutes % stepMinutes !== 0) {
    errors.push("DURATION_NOT_MULTIPLE_OF_STEP");
  }
  const name = normalizeServiceName(draft.name);
  if (otherActiveNames.some((other) => normalizeServiceName(other) === name)) errors.push("NAME_TAKEN");
  return errors.length === 0 ? ok(undefined) : err(errors);
}

/** "Corte de pelo" → "corte-de-pelo"; sin tildes ni símbolos, para usar en la dirección. */
export function serviceSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
