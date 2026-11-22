"use server";

import { redirect } from "next/navigation";
import { saveProfile } from "@/modules/customers";
import { getActor } from "@/server/auth/actor";
import { customersStore } from "@/server/customers";

export type ProfileState = { fields?: Record<string, string>; form?: string; saved?: boolean };

/** RF-9 a RF-14: guardar el perfil. La primera vez, después de guardar, lleva a los turnos. */
export async function saveProfileAction(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const actor = await getActor();
  if (actor.kind !== "customer") redirect("/");
  const day = Number(form.get("birthDay") || 0);
  const month = Number(form.get("birthMonth") || 0);
  const result = await saveProfile({ store: customersStore() }, actor, {
    name: String(form.get("name") ?? "").slice(0, 200),
    phone: String(form.get("phone") ?? "").slice(0, 40),
    // Día y mes van juntos: con uno solo, se rechaza.
    birthday: day || month ? { day, month } : null,
  });
  if (!result.ok) return result.error === "NOT_ALLOWED" ? { form: "TRY_AGAIN" } : result.error;
  if (!actor.profileComplete) redirect("/turnos");
  return { saved: true };
}
