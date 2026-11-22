"use client";

import { CircleCheck, Info } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/ui/Button";
import { Field, Select, TextInput } from "@/ui/Field";
import { FieldError, FormAlert } from "../_sesion/FormBits";
import { errorText, NEEDS_CONTACT } from "../_sesion/messages";
import { saveProfileAction, type ProfileState } from "./actions";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export type ProfileDefaults = { name: string; phone: string; birthDay: number | null; birthMonth: number | null };

/** RF-9 a RF-14: nombre, teléfono y cumpleaños (opcional, sin año). */
export function ProfileForm({ defaults, complete, contact }: { defaults: ProfileDefaults; complete: boolean; contact: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, {});
  const f = state.fields ?? {};
  const contactLink = (code?: string) =>
    code && NEEDS_CONTACT.has(code) ? (
      <a href={`https://wa.me/${contact.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline decoration-2 underline-offset-4">
        Escribirle a Colo
      </a>
    ) : null;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {!complete ? (
        <p className="text-[17px]">Todavía no cargaste tu nombre y tu celular. Podés hacerlo ahora o cuando reserves.</p>
      ) : null}
      {state.form ? <FormAlert title="No pudimos guardar">{errorText(state.form)}</FormAlert> : null}
      {state.saved ? (
        <p role="status" className="inline-flex items-center gap-2 font-bold text-ok">
          <CircleCheck aria-hidden size={20} strokeWidth={2.5} /> Guardado
        </p>
      ) : null}

      <Field label="Nombre" hint="Cómo te conoce Colo">
        <TextInput name="name" autoComplete="given-name" defaultValue={defaults.name} maxLength={60} aria-invalid={!!f.name} aria-describedby="error-nombre" disabled={pending} />
      </Field>
      <FieldError id="error-nombre">{errorText(f.name)}</FieldError>

      <Field label="Celular" hint="Con código de área, por ejemplo 11 3816-3491">
        <TextInput name="phone" type="tel" inputMode="tel" autoComplete="tel-national" defaultValue={defaults.phone} maxLength={30} aria-invalid={!!f.phone} aria-describedby="error-celular" disabled={pending} />
      </Field>
      <FieldError id="error-celular">
        {f.phone ? (
          <>
            {errorText(f.phone)} {contactLink(f.phone)}
          </>
        ) : null}
      </FieldError>

      <fieldset className="flex flex-col gap-1.5" aria-describedby="ayuda-cumple error-cumple">
        <legend className="text-[15px] font-bold">Cumpleaños (opcional)</legend>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <Select name="birthDay" aria-label="Día" defaultValue={defaults.birthDay ?? ""} disabled={pending}>
            <option value="">Día</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </Select>
          <Select name="birthMonth" aria-label="Mes" defaultValue={defaults.birthMonth ?? ""} disabled={pending}>
            <option value="">Mes</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
        </div>
        {!defaults.birthDay ? (
          <p id="ayuda-cumple" className="inline-flex items-start gap-1.5 text-[15px] text-tinta-suave">
            <Info aria-hidden size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" />
            Si no cargás tu cumpleaños, no vas a tener el descuento de cumpleaños.
          </p>
        ) : null}
      </fieldset>
      <FieldError id="error-cumple">{errorText(f.birthday)}</FieldError>

      <Button type="submit" variant="principal" disabled={pending} className="w-full">
        {pending ? "Guardando…" : complete ? "Guardar cambios" : "Guardar y ver turnos"}
      </Button>
    </form>
  );
}
