/** Textos de error para las personas (RNF-5). Los códigos vienen de los casos de uso; nunca se muestran. */
const MESSAGES: Record<string, string> = {
  CREDENTIALS: "No pudimos ingresar. Revisá el correo y la contraseña.",
  NAME_LENGTH: "El nombre tiene que tener entre 2 y 40 letras.",
  PHONE_INVALID: "Revisá el número: tiene que ser un celular, con código de área.",
  PHONE_FOREIGN: "Revisá el número: tiene que ser un celular, con código de área. Si tu número no es de Argentina, escribile a Colo.",
  PHONE_TAKEN: "Ese teléfono ya está registrado. Si es tuyo, escribile a Colo.",
  PHONE_HAS_ACCOUNT: "Ese teléfono ya tiene una cuenta. Entrá con ella.",
  RATE_LIMITED: "Esperá un rato y probá de nuevo.",
  BIRTHDAY_INVALID: "Revisá la fecha: ese día no existe.",
  NICKNAME_LENGTH: "El sobrenombre puede tener hasta 40 letras.",
  TRY_AGAIN: "No pudimos completar el pedido. Probá de nuevo.",
};

export function errorText(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return MESSAGES[code] ?? MESSAGES.TRY_AGAIN;
}

/** Errores que conviene acompañar con el WhatsApp de Colo. */
export const NEEDS_CONTACT = new Set(["PHONE_TAKEN", "PHONE_FOREIGN"]);
