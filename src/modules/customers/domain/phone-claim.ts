/** A quién pertenece hoy un teléfono, visto desde quien lo quiere usar. */
export type PhoneOwner = { kind: "holder" | "guest"; isSelf: boolean } | null;

/**
 * - `free`: nadie lo tiene.
 * - `own`: ya es de quien lo carga.
 * - `taken_by_account`: es de otra cuenta → se rechaza (RF-11; para un invitado, RF-16).
 * - `guest_to_merge`: una cuenta carga el teléfono de un invitado → se unen (RF-12).
 * - `same_guest`: un invitado entra con el teléfono de un invitado → es el mismo cliente (RF-17).
 */
export type PhoneClaim = "free" | "own" | "taken_by_account" | "guest_to_merge" | "same_guest";

export function claimPhone(who: "account" | "guest", owner: PhoneOwner): PhoneClaim {
  if (!owner) return "free";
  if (owner.kind === "holder") return owner.isSelf && who === "account" ? "own" : "taken_by_account";
  return who === "account" ? "guest_to_merge" : "same_guest";
}
