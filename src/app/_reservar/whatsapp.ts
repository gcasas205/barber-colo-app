/** Enlace para escribirle a Colo por WhatsApp con un mensaje ya cargado. */
/** Enlace a un chat de WhatsApp. El texto inicial es opcional (sin texto, se abre el chat vacío). */
export function whatsappHref(number: string, text?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Para escribirle a Colo desde la app (botones de contacto de los clientes). */
export const TO_COLO = "Hola Colo, quería pedir un turno.";

/** "+5491138163491" → "11 3816-3491" (cómo lo anotaría una persona en Buenos Aires). */
export function formatWhatsapp(number: string): string {
  const digits = number.replace(/\D/g, "");
  const local = digits.startsWith("549") ? digits.slice(3) : digits;
  if (local.length !== 10) return number;
  return `${local.slice(0, 2)} ${local.slice(2, 6)}-${local.slice(6)}`;
}
