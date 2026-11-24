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
  const name = normalizeServiceName(draft.name);
  const errors = [
    ...textErrors(draft),
    priceError(draft.priceCents),
    durationError(draft.durationMinutes, stepMinutes),
    otherActiveNames.some((other) => normalizeServiceName(other) === name) ? "NAME_TAKEN" : null,
  ].filter((e): e is ServiceError => e !== null);
  return errors.length === 0 ? ok(undefined) : err(errors);
}

function textErrors(draft: ServiceDraft): ServiceError[] {
  const name = draft.name.trim();
  return [
    ...(name.length < 1 || name.length > SERVICE_LIMITS.nameLength ? (["NAME_LENGTH"] as const) : []),
    ...((draft.description ?? "").trim().length > SERVICE_LIMITS.descriptionLength ? (["DESCRIPTION_TOO_LONG"] as const) : []),
  ];
}

function priceError(priceCents: number): ServiceError | null {
  if (!Number.isInteger(priceCents) || priceCents <= 0) return "PRICE_NOT_POSITIVE";
  if (priceCents % 100 !== 0) return "PRICE_HAS_CENTS"; // pesos enteros (RF-3)
  if (priceCents > SERVICE_LIMITS.maxPriceCents) return "PRICE_TOO_HIGH";
  return null;
}

function durationError(durationMinutes: number, stepMinutes: number): ServiceError | null {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes % stepMinutes !== 0) {
    return "DURATION_NOT_MULTIPLE_OF_STEP";
  }
  return durationMinutes > SERVICE_LIMITS.maxDurationMinutes ? "DURATION_OUT_OF_RANGE" : null;
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
