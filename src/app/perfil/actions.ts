"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDependent, removeDependent, saveProfile, updateDependent } from "@/modules/customers";
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

/** Spec 004b: lo que vuelve a "Personas a cargo". Los códigos se pasan a palabras en el cliente. */
export type DependentResult =
  | { ok: true; dependent?: { id: string; name: string; birthDay: number | null; birthMonth: number | null } }
  | { ok: false; error: "LIMIT" | "HAS_UPCOMING" | "TRY_AGAIN"; fields?: Record<string, string> };

const dependentInput = (input: unknown) => {
  const i = (input ?? {}) as { name?: unknown; birthDay?: unknown; birthMonth?: unknown };
  const day = Number(i.birthDay || 0);
  const month = Number(i.birthMonth || 0);
  return { name: String(i.name ?? "").slice(0, 200), birthday: day || month ? { day, month } : null };
};
const toResult = (d: { id: string; name: string; birthday: { day: number; month: number } | null }): DependentResult => ({
  ok: true,
  dependent: { id: d.id, name: d.name.replace(/ \(demo\)$/, ""), birthDay: d.birthday?.day ?? null, birthMonth: d.birthday?.month ?? null },
});

/** RF-2, RF-3. */
export async function addDependentAction(input: unknown): Promise<DependentResult> {
  const actor = await getActor();
  if (actor.kind !== "customer") redirect("/");
  const r = await addDependent({ store: customersStore() }, actor, dependentInput(input));
  if (r.ok) return toResult(r.value);
  if (r.error === "LIMIT") return { ok: false, error: "LIMIT" };
  return r.error === "NOT_ALLOWED" ? { ok: false, error: "TRY_AGAIN" } : { ok: false, error: "TRY_AGAIN", fields: r.error.fields };
}

/** RF-4. */
export async function updateDependentAction(id: unknown, input: unknown): Promise<DependentResult> {
  const actor = await getActor();
  if (actor.kind !== "customer") redirect("/");
  if (typeof id !== "string") return { ok: false, error: "TRY_AGAIN" };
  const r = await updateDependent({ store: customersStore() }, actor, id, dependentInput(input));
  if (r.ok) return toResult(r.value);
  return r.error === "NOT_ALLOWED" ? { ok: false, error: "TRY_AGAIN" } : { ok: false, error: "TRY_AGAIN", fields: r.error.fields };
}

/** RF-5, RF-6. */
export async function removeDependentAction(id: unknown): Promise<DependentResult> {
  const actor = await getActor();
  if (actor.kind !== "customer") redirect("/");
  if (typeof id !== "string") return { ok: false, error: "TRY_AGAIN" };
  const r = await removeDependent({ store: customersStore() }, actor, id, new Date());
  if (r.ok) {
    revalidatePath("/turnos");
    return { ok: true };
  }
  return { ok: false, error: r.error === "HAS_UPCOMING" ? "HAS_UPCOMING" : "TRY_AGAIN" };
}
