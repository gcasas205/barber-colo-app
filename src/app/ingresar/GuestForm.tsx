"use client";

import { UserRound } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/ui/Button";
import { Field, TextInput } from "@/ui/Field";
import { FieldError, FormAlert } from "../_sesion/FormBits";
import { errorText } from "../_sesion/messages";
import { signInAsGuest, type GuestState } from "./actions";

/** RF-15: entrar como invitado, con el aviso de los descuentos. */
export function GuestForm() {
  const [state, action, pending] = useActionState<GuestState, FormData>(signInAsGuest, {});
  const f = state.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <p className="rounded-[var(--radius-control)] bg-espera-fondo px-4 py-3 text-[16px] text-tinta shadow-[inset_0_0_0_2px_var(--espera)]">
        <strong>Como invitado no acumulás visitas para los descuentos.</strong> Podés crear tu cuenta cuando quieras.
      </p>
      {state.form ? <FormAlert title="No pudimos entrar">{errorText(state.form)}</FormAlert> : null}
      <Field label="Tu nombre">
        <TextInput
          name="name"
          autoComplete="given-name"
          defaultValue={state.name}
          maxLength={60}
          aria-invalid={!!f.name}
          aria-describedby="error-nombre"
          disabled={pending}
        />
      </Field>
      <FieldError id="error-nombre">{errorText(f.name)}</FieldError>
      <Field label="Tu celular" hint="Con código de área, por ejemplo 11 3816-3491">
        <TextInput
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          defaultValue={state.phone}
          maxLength={30}
          aria-invalid={!!f.phone}
          aria-describedby="error-celular"
          disabled={pending}
        />
      </Field>
      <FieldError id="error-celular">{errorText(f.phone)}</FieldError>
      <Button type="submit" variant="esmalte" disabled={pending} className="w-full">
        <UserRound aria-hidden size={22} strokeWidth={2.5} />
        {pending ? "Entrando…" : "Entrar como invitado"}
      </Button>
    </form>
  );
}
