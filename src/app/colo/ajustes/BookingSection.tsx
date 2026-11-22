"use client";

import { useId, useState, useTransition } from "react";
import { SETTINGS_LIMITS } from "@/modules/schedule";
import { Field, Select, TextInput } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { FieldError } from "../../_sesion/FormBits";
import { formatWhatsapp } from "../../_reservar/whatsapp";
import { saveBookingAction, type SaveResult } from "./actions";
import { noticeLabel } from "./format";
import { SaveBar } from "./SaveBar";
import { useUnsavedGuard } from "./unsaved";

// Opciones de anticipación mínima dentro del rango (0 a 48 h, de a 15 min).
const NOTICE_OPTIONS = [0, 15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440, 2160, 2880].filter(
  (m) => m <= SETTINGS_LIMITS.minNotice.max,
);

type Values = { minNoticeMinutes: number; maxAdvanceDays: string; whatsapp: string };

/** RF-22 a RF-24: con cuánta anticipación y hasta cuántos días se reserva, y a qué WhatsApp escriben. */
export function BookingSection(initial: { minNoticeMinutes: number; maxAdvanceDays: number; whatsapp: string }) {
  const start: Values = { minNoticeMinutes: initial.minNoticeMinutes, maxAdvanceDays: String(initial.maxAdvanceDays), whatsapp: formatWhatsapp(initial.whatsapp) };
  const [baseline, setBaseline] = useState(start);
  const [values, setValues] = useState(start);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, run] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  useUnsavedGuard("reserva", dirty);
  const errors = result && !result.ok ? result.errors : {};
  const ids = { notice: useId(), advance: useId(), whatsapp: useId() };
  const set = (patch: Partial<Values>) => {
    setValues({ ...values, ...patch });
    setResult(null);
  };
  const options = NOTICE_OPTIONS.includes(values.minNoticeMinutes) ? NOTICE_OPTIONS : [...NOTICE_OPTIONS, values.minNoticeMinutes].sort((a, b) => a - b);

  return (
    <Plate className="flex flex-col gap-4 p-5" aria-labelledby="titulo-reservas">
      <Field label="Anticipación mínima" hint="Cuánto antes del turno se puede reservar.">
        <Select aria-describedby={ids.notice} value={values.minNoticeMinutes} onChange={(e) => set({ minNoticeMinutes: Number(e.target.value) })}>
          {options.map((m) => (
            <option key={m} value={m}>
              {noticeLabel(m)}
            </option>
          ))}
        </Select>
      </Field>
      <FieldError id={ids.notice}>{errors.minNotice}</FieldError>
      <Field label="Días a futuro" hint={`Hasta cuántos días adelante se puede reservar (de ${SETTINGS_LIMITS.maxAdvanceDays.min} a ${SETTINGS_LIMITS.maxAdvanceDays.max}).`}>
        <TextInput
          inputMode="numeric"
          aria-describedby={ids.advance}
          value={values.maxAdvanceDays}
          onChange={(e) => set({ maxAdvanceDays: e.target.value.replace(/\D/g, "").slice(0, 3) })}
        />
      </Field>
      <FieldError id={ids.advance}>{errors.maxAdvance}</FieldError>
      <Field label="WhatsApp de contacto" hint="Celular con código de área, por ejemplo 11 3816-3491. Lo usan todos los botones de WhatsApp.">
        <TextInput type="tel" autoComplete="off" aria-describedby={ids.whatsapp} value={values.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
      </Field>
      <FieldError id={ids.whatsapp}>{errors.whatsapp}</FieldError>
      <SaveBar
        label="Guardar reservas y contacto"
        pending={pending}
        saved={!!result?.ok}
        dirty={dirty}
        error={errors.form}
        onSave={() =>
          run(async () => {
            const r = await saveBookingAction({ ...values, maxAdvanceDays: Number(values.maxAdvanceDays || 0) });
            setResult(r);
            if (r.ok) setBaseline(values);
          })
        }
      />
    </Plate>
  );
}
