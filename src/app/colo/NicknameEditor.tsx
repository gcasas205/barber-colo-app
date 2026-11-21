"use client";

import { Pencil } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { Button } from "@/ui/Button";
import { TextInput } from "@/ui/Field";
import { FieldError } from "../_sesion/FormBits";
import { errorText } from "../_sesion/messages";
import { saveNicknameAction, type NicknameState } from "./actions";

/** RF-20: editar el sobrenombre en el lugar. Vacío lo borra. */
export function NicknameEditor({ customerId, nickname, name }: { customerId: string; nickname: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<NicknameState, FormData>(async (prev, form) => {
    const result = await saveNicknameAction(prev, form);
    if (result.saved) setOpen(false); // guardado: se cierra el editor
    return result;
  }, {});
  const errorId = useId();

  if (!open) {
    return (
      <Button variant="texto" className="self-start" onClick={() => setOpen(true)} aria-label={`${nickname ? "Cambiar" : "Poner"} sobrenombre a ${name}`}>
        <Pencil aria-hidden size={18} strokeWidth={2.5} /> {nickname ? "Cambiar sobrenombre" : "Poner sobrenombre"}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="customerId" value={customerId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-bold">Sobrenombre de {name}</span>
        <span className="text-[14px] text-tinta-suave">Solo lo ves vos. Dejalo vacío para borrarlo.</span>
        <TextInput name="nickname" defaultValue={nickname ?? ""} maxLength={60} autoFocus aria-describedby={errorId} disabled={pending} />
      </label>
      <FieldError id={errorId}>{errorText(state.error)}</FieldError>
      <div className="flex gap-2">
        <Button type="submit" variant="esmalte" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="secundario" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
