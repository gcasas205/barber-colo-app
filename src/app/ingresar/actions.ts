"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { enterAsDemo, enterAsGuest } from "@/modules/customers";
import { customersStore, ipHash } from "@/server/customers";
import { supabaseServer } from "@/server/auth/supabase";
import { authEnv } from "@/shared/config/env";

export type LoginState = { error?: string; email?: string };
export type GuestState = { fields?: Record<string, string>; form?: string; name?: string; phone?: string };

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

/** RF-1, RF-1b, RF-1c, RF-22: correo y contraseña (solo cuentas de prueba mientras no haya Google). */
export async function signInWithPassword(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  const email = String(form.get("email") ?? "");
  if (!parsed.success) return { error: "CREDENTIALS", email };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "CREDENTIALS", email };

  const entered = await enterAsDemo(
    { store: customersStore(), demoEnabled: authEnv().DEMO_ENABLED },
    { authUserId: data.user.id, email: parsed.data.email },
  );
  if (!entered.ok) {
    // RF-1c: una cuenta que no es de prueba (o la demo apagada) no entra; no se dice por qué.
    await supabase.auth.signOut({ scope: "local" });
    return { error: "CREDENTIALS", email };
  }
  redirect(entered.value.kind === "barber" ? "/colo" : "/perfil");
}

/** RF-15 a RF-18b: entrar como invitado con nombre y teléfono. */
export async function signInAsGuest(_prev: GuestState, form: FormData): Promise<GuestState> {
  const name = String(form.get("name") ?? "").slice(0, 200);
  const phone = String(form.get("phone") ?? "").slice(0, 40);
  const supabase = await supabaseServer();
  const result = await enterAsGuest(
    {
      store: customersStore(),
      createSession: async () => {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) throw new Error("No se pudo crear la sesión de invitado");
        return data.user.id;
      },
    },
    { name, phone, ipHash: await ipHash(), now: new Date() },
  );
  if (!result.ok) return { ...result.error, name, phone };
  redirect("/perfil");
}

/** RF-5: salir en este dispositivo. */
export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

/** RF-5b: Colo cierra todas sus sesiones (por ejemplo, si pierde el celular). */
export async function signOutEverywhere(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/");
}
