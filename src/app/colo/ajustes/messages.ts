import type { IsoWeekday } from "@/shared/kernel";

/** Nombres de los días para Ajustes: 1 = lunes … 7 = domingo. */
export const WEEKDAY_NAMES: Record<IsoWeekday, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

/** Textos de error de Ajustes (RNF-4). Los códigos vienen del dominio; nunca se muestran. */
const MESSAGES: Record<string, string> = {
  RANGE_INVERTED: "Una franja cierra antes o a la misma hora en que abre.",
  RANGES_OVERLAP: "Dos franjas se superponen.",
  RANGE_OUT_OF_DAY: "Revisá las horas: van de 00:00 a 24:00.",
  RANGE_NOT_ON_STEP: "Las horas tienen que coincidir con el paso de la agenda.",
  TOO_MANY_RANGES: "Puede haber hasta 4 franjas por día.",
  STEP_INVALID: "Elegí un paso de la lista.",
  MIN_NOTICE_OUT_OF_RANGE: "Elegí entre 0 y 48 horas.",
  MAX_ADVANCE_OUT_OF_RANGE: "Elegí entre 1 y 90 días.",
  WHATSAPP_INVALID: "Revisá el número: tiene que ser un celular argentino, con código de área.",
  PHONE_INVALID: "Revisá el número: tiene que ser un celular argentino, con código de área.",
  PHONE_FOREIGN: "Tiene que ser un celular argentino.",
  DAYS_INVERTED: "El último día no puede ser antes del primero.",
  HOURS_INVERTED: "El bloqueo tiene que terminar después de empezar.",
  HOURS_INVALID: "Revisá las horas.",
  BLOCK_IN_PAST: "Ese bloqueo ya terminó.",
  NOTICE_TOO_LONG: "El aviso puede tener hasta 80 letras.",
  NAME_LENGTH: "El nombre tiene que tener entre 1 y 60 letras.",
  NAME_TAKEN: "Ya hay otro servicio con ese nombre.",
  DESCRIPTION_TOO_LONG: "Puede tener hasta 200 letras.",
  PRICE_NOT_POSITIVE: "Poné un precio mayor que cero.",
  PRICE_HAS_CENTS: "El precio va en pesos enteros, sin centavos.",
  PRICE_TOO_HIGH: "El precio puede ser hasta $ 9.999.999.",
  DURATION_NOT_MULTIPLE_OF_STEP: "La duración tiene que ser un múltiplo del paso de la agenda.",
  DURATION_OUT_OF_RANGE: "La duración puede ser hasta 10 horas.",
  TRY_AGAIN: "No pudimos guardar. Probá de nuevo.",
};

export const settingsError = (code: string) => MESSAGES[code] ?? MESSAGES.TRY_AGAIN!;
