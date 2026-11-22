"use client";

import { CircleCheck } from "lucide-react";
import { Button } from "@/ui/Button";
import { FormAlert } from "../../_sesion/FormBits";

/** Botón de guardar de una sección, con "Guardado" o el error general al lado (RF-25). */
export function SaveBar({
  label,
  pending,
  saved,
  dirty,
  error,
  onSave,
  canSave = dirty,
}: {
  label: string;
  pending: boolean;
  saved: boolean;
  dirty: boolean;
  error?: string;
  onSave: () => void;
  /** Por defecto, solo con cambios. Un bloqueo nuevo se puede cargar con los valores iniciales. */
  canSave?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert title="No se guardó">{error}</FormAlert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="esmalte" onClick={onSave} disabled={pending || !canSave}>
          {pending ? "Guardando…" : label}
        </Button>
        <p role="status" className="inline-flex items-center gap-1.5 font-bold text-ok">
          {saved && !dirty ? (
            <>
              <CircleCheck aria-hidden size={20} strokeWidth={2.5} /> Guardado
            </>
          ) : dirty ? (
            <span className="font-normal text-tinta-suave">Cambios sin guardar</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
