/** Enlace para escribirle a Colo por WhatsApp con un mensaje ya cargado. */
export function whatsappHref(number: string, text = "Hola Colo, quería pedir un turno."): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** "+5491138163491" → "11 3816-3491" (cómo lo anotaría una persona en Buenos Aires). */
export function formatWhatsapp(number: string): string {
  const digits = number.replace(/\D/g, "");
  const local = digits.startsWith("549") ? digits.slice(3) : digits;
  if (local.length !== 10) return number;
  return `${local.slice(0, 2)} ${local.slice(2, 6)}-${local.slice(6)}`;
}
