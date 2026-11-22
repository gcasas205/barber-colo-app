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
export type ServiceDraft = Pick<Service, "name" | "priceCents" | "durationMinutes"> & { description?: string };

export type ServiceError =
  | "PRICE_NOT_POSITIVE"
  | "PRICE_HAS_CENTS"
  | "PRICE_TOO_HIGH"
  | "DURATION_NOT_MULTIPLE_OF_STEP"
  | "DURATION_OUT_OF_RANGE"
  | "NAME_LENGTH"
  | "DESCRIPTION_TOO_LONG"
  | "NAME_TAKEN";

/** Rangos de la spec 003 ("Definiciones"). */
export const SERVICE_LIMITS = {
  nameLength: 60,
  descriptionLength: 200,
  maxPriceCents: 999_999_900,
  maxDurationMinutes: 600,
} as const;

/** Forma de comparar nombres: igual que el índice único de la base, `lower(trim(name))`. */
export const normalizeServiceName = (name: string) => name.trim().toLowerCase();

/**
 * RF-13: precio positivo y en pesos enteros, duración múltiplo del paso y nombre distinto de los demás servicios activos.
 * `otherActiveNames` no incluye al servicio que se está editando.
 */
export function validateService(
  draft: ServiceDraft,
  stepMinutes: number,
  otherActiveNames: string[],
): Result<void, ServiceError[]> {
  const errors: ServiceError[] = [];
  const name = normalizeServiceName(draft.name);
  if (name.length < 1 || draft.name.trim().length > SERVICE_LIMITS.nameLength) errors.push("NAME_LENGTH");
  if ((draft.description ?? "").trim().length > SERVICE_LIMITS.descriptionLength) errors.push("DESCRIPTION_TOO_LONG");
  if (!Number.isInteger(draft.priceCents) || draft.priceCents <= 0) errors.push("PRICE_NOT_POSITIVE");
  else if (draft.priceCents % 100 !== 0) errors.push("PRICE_HAS_CENTS"); // pesos enteros (RF-3)
  else if (draft.priceCents > SERVICE_LIMITS.maxPriceCents) errors.push("PRICE_TOO_HIGH");
  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes <= 0 || draft.durationMinutes % stepMinutes !== 0) {
    errors.push("DURATION_NOT_MULTIPLE_OF_STEP");
  } else if (draft.durationMinutes > SERVICE_LIMITS.maxDurationMinutes) {
    errors.push("DURATION_OUT_OF_RANGE");
  }
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

/** RF-18: sube o baja un servicio en el orden. En los extremos no cambia nada. */
export function moveService<T>(order: T[], id: T, direction: "up" | "down"): T[] {
  const i = order.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}
