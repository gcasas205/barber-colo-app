import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createCustomersStore } from "@/modules/customers/infrastructure/customers-store";
import { database } from "@/shared/db/client";
import { authEnv } from "@/shared/config/env";

export const customersStore = () => createCustomersStore(database());

/**
 * Hash de la IP para limitar los intentos de invitado (RF-18b). Nunca se guarda la IP: solo
 * sha256(pepper + IP). La IP sale del primer valor de x-forwarded-for, que pone el hosting.
 */
export async function ipHash(): Promise<string> {
  const pepper = authEnv().IP_HASH_PEPPER;
  if (!pepper && process.env.NODE_ENV === "production") throw new Error("Falta IP_HASH_PEPPER");
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "desconocida";
  return createHash("sha256").update(`${pepper ?? "solo-desarrollo"}:${ip}`).digest("hex");
}
