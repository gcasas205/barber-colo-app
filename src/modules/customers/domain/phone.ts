import { err, ok, type Result } from "@/shared/kernel";

/** Teléfono en formato internacional de celular argentino: "+549" + 10 dígitos. */
export type PhoneE164 = string & { readonly __brand: "PhoneE164" };
export type PhoneError = "PHONE_INVALID" | "PHONE_FOREIGN";

/** Número nacional de 10 dígitos con un código de área posible: 11 (AMBA) o empieza con 2 o 3. */
const isNational10 = (n: string) => /^(11|[23])\d+$/.test(n) && n.length === 10;

/** Saca el "15" que la gente escribe después del código de área ("11 15 3816-3491"). */
function withoutFifteen(n: string): string | null {
  for (const areaLength of [2, 3, 4]) {
    if (n.slice(areaLength, areaLength + 2) !== "15") continue;
    const candidate = n.slice(0, areaLength) + n.slice(areaLength + 2);
    const areaFits = areaLength === 2 ? candidate.startsWith("11") : /^[23]/.test(candidate);
    if (areaFits && isNational10(candidate)) return candidate;
  }
  return null;
}

/**
 * Lee un celular argentino como lo escribe una persona ("11 3816-3491", "011 15 3816-3491",
 * "+54 9 11 3816-3491") y lo devuelve como "+5491138163491". Sin código de área, se rechaza.
 */
export function normalizeArPhone(raw: string): Result<PhoneE164, PhoneError> {
  const text = raw.trim();
  if (!text || /[a-z]/i.test(text)) return err("PHONE_INVALID");
  const national = nationalDigits(text);
  if (national === null) return err("PHONE_FOREIGN");
  const result = isNational10(national) ? national : national.length === 12 ? withoutFifteen(national) : null;
  return result ? ok(`+549${result}` as PhoneE164) : err("PHONE_INVALID");
}

/** Los dígitos sin el país ni el prefijo de celular (9) o de larga distancia (0); null si es de otro país. */
function nationalDigits(text: string): string | null {
  const all = text.replace(/\D/g, "");
  const international = text.startsWith("+") || all.startsWith("00");
  const digits = all.startsWith("00") ? all.slice(2) : all;
  if (international && !digits.startsWith("54")) return null;
  // Con +, o "54 9 11 …" sin el +: se saca el país y el 9 (o el 0) que sigue. Si no, solo el 0.
  const withCountry = international || (digits.startsWith("54") && digits.length >= 12);
  return withCountry ? digits.slice(2).replace(/^[90]/, "") : digits.replace(/^0/, "");
}

// Códigos de área de 3 dígitos (el resto, salvo 11, son de 4). Solo para mostrar el número.
const AREAS_3 = new Set(
  "220 221 223 230 236 237 249 260 261 263 264 266 280 291 294 297 298 299 341 342 343 345 348 351 353 358 362 364 370 376 379 380 381 383 385 387 388".split(
    " ",
  ),
);

/** "+5491138163491" → "11 3816-3491"; "+5493515123456" → "351 512-3456". */
export function formatArPhone(phone: string): string {
  const n = phone.replace(/^\+549/, "");
  const areaLength = n.startsWith("11") ? 2 : AREAS_3.has(n.slice(0, 3)) ? 3 : 4;
  const area = n.slice(0, areaLength);
  const rest = n.slice(areaLength);
  return `${area} ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
}
