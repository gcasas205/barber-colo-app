import { APPOINTMENT_POLICY } from "@/modules/appointments";
import { formatDayLong, formatMinute, localDateOf, minuteOfDayOf } from "@/shared/kernel";
import { errorText } from "../_sesion/messages";

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Miércoles 25 de noviembre, 16:00". */
export const when = (ms: number) => `${cap(formatDayLong(localDateOf(new Date(ms))))}, ${formatMinute(minuteOfDayOf(new Date(ms)))}`;
export const hour = (ms: number) => formatMinute(minuteOfDayOf(new Date(ms)));
/** "tu turno" o "el turno de Tomi" (004b, RF-14). */
export const of = (t: { isSelf: boolean; customerName: string }) => (t.isSelf ? "tu turno" : `el turno de ${t.customerName}`);

/** Textos de los errores de Turnos (RNF-5 de la 004). */
export const TURNO_MESSAGES: Record<string, string> = {
  SLOT_TAKEN: "Ese horario se acaba de ocupar. Elegí otro.",
  HAS_UPCOMING: "Ya tenés un turno reservado. Para sacar otro, primero cancelá el que tenés.",
  SERVICE_UNAVAILABLE: "Ese servicio ya no se ofrece. Elegí otro.",
  RESCHEDULE_LIMIT: `Ya cambiaste este turno ${APPOINTMENT_POLICY.maxCustomerReschedules} veces. Podés cancelarlo y reservar de nuevo.`,
  STARTED: "El turno ya empezó: no se puede cambiar desde la app. Escribile a Colo.",
  NOT_FOUND: "Ese turno ya no está activo.",
  PHONE_HAS_ACCOUNT: "Ese celular ya tiene una cuenta. Ingresá con ella para reservar.",
};
export const turnosError = (code: string) => TURNO_MESSAGES[code] ?? errorText(code) ?? errorText("TRY_AGAIN")!;
