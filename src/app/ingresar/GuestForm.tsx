"use client";

import { UserRound } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/ui/Button";
import { FormAlert } from "../_sesion/FormBits";
import { errorText } from "../_sesion/messages";
import { signInAsGuest, type GuestState } from "./actions";

/** Spec 004, RF-4: entrar como invitado con un toque, con el aviso de los descuentos (RF-15 de la 002). */
export function GuestForm() {
  const [state, action, pending] = useActionState<GuestState>(signInAsGuest, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="rounded-[var(--radius-control)] bg-espera-fondo px-4 py-3 text-[16px] text-tinta shadow-[inset_0_0_0_2px_var(--espera)]">
        <strong>Como invitado no acumulás visitas para los descuentos.</strong> Tu nombre y tu celular te los pedimos
        recién al reservar.
      </p>
      {state.form ? <FormAlert title="No pudimos entrar">{errorText(state.form)}</FormAlert> : null}
      <Button type="submit" variant="esmalte" disabled={pending} className="w-full">
        <UserRound aria-hidden size={22} strokeWidth={2.5} />
        {pending ? "Entrando…" : "Entrar como invitado"}
      </Button>
    </form>
  );
}
