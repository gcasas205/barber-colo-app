"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, TriangleAlert } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { SERVICE_LIMITS, type AdminService } from "@/modules/pricing";
import { formatDuration, formatPesos } from "@/shared/kernel";
import { Button } from "@/ui/Button";
import { Field, MoneyInput, Select, Switch, TextInput } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { cx } from "@/ui/cx";
import { FieldError, FormAlert } from "../../_sesion/FormBits";
import { deactivateServiceAction, moveServiceAction, reactivateServiceAction, saveServiceAction, type SaveResult } from "./actions";
import { SaveBar } from "./SaveBar";
import { useUnsavedGuard } from "./unsaved";

type Draft = { id: string | null; name: string; description: string; durationMinutes: number; pesos: string; countsForBenefits: boolean };

const toDraft = (s: AdminService | null, step: number): Draft =>
  s
    ? { id: s.id, name: s.name, description: s.description, durationMinutes: s.durationMinutes, pesos: (s.priceCents / 100).toLocaleString("es-AR"), countsForBenefits: s.countsForBenefits }
    : { id: null, name: "", description: "", durationMinutes: Math.max(step, 30 - (30 % step)), pesos: "", countsForBenefits: true };

/** RF-15 a RF-21. */
export function ServicesSection({ services, step }: { services: AdminService[]; step: number }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmLast, setConfirmLast] = useState<string | null>(null);
  const [pending, run] = useTransition();
  const offered = services.filter((s) => s.active);
  const removed = services.filter((s) => !s.active);

  const act = (fn: () => Promise<SaveResult>, okText: string) =>
    run(async () => {
      const r = await fn();
      if (r.ok) setMessage({ ok: true, text: okText });
      else if (r.confirmLast) return;
      else setMessage({ ok: false, text: Object.values(r.errors).join(" ") || "No pudimos guardar. Probá de nuevo." });
    });

  return (
    <div className="flex flex-col gap-4">
      {message ? (
        message.ok ? (
          <p role="status" className="rounded-[var(--radius-control)] bg-ok-fondo px-4 py-3 font-bold text-ok">
            {message.text}
          </p>
        ) : (
          <FormAlert title="No se guardó">{message.text}</FormAlert>
        )
      ) : null}

      <ul className="flex flex-col gap-3" aria-label="Servicios que se ofrecen">
        {offered.map((s, i) =>
          editing === s.id ? (
            <li key={s.id}>
              <ServiceEditor initial={toDraft(s, step)} step={step} onDone={(text) => (setEditing(null), text && setMessage({ ok: true, text }))} />
            </li>
          ) : (
            <li key={s.id}>
              <Plate className="flex flex-col gap-3 px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[18px] font-bold">{s.name}</p>
                    <p className="text-[15px] text-tinta-suave">
                      {s.description ? `${s.description} · ` : ""}
                      {formatDuration(s.durationMinutes)} · {s.countsForBenefits ? "suma para beneficios" : "no suma para beneficios"}
                    </p>
                  </div>
                  <p className="cifra shrink-0 text-[19px]">{formatPesos(s.priceCents)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secundario" className="px-3" onClick={() => (setEditing(s.id), setMessage(null))} aria-label={`Editar ${s.name}`}>
                    <Pencil aria-hidden size={18} strokeWidth={2.5} /> Editar
                  </Button>
                  <Button variant="secundario" className="px-3" disabled={pending || i === 0} aria-label={`Subir ${s.name}`} onClick={() => act(() => moveServiceAction(s.id, "up"), `Subiste ${s.name}.`)}>
                    <ArrowUp aria-hidden size={18} strokeWidth={2.5} />
                  </Button>
                  <Button
                    variant="secundario"
                    className="px-3"
                    disabled={pending || i === offered.length - 1}
                    aria-label={`Bajar ${s.name}`}
                    onClick={() => act(() => moveServiceAction(s.id, "down"), `Bajaste ${s.name}.`)}
                  >
                    <ArrowDown aria-hidden size={18} strokeWidth={2.5} />
                  </Button>
                  <Button
                    variant="texto"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const r = await deactivateServiceAction(s.id, false);
                        if (!r.ok && r.confirmLast) setConfirmLast(s.id);
                        else if (r.ok) setMessage({ ok: true, text: `${s.name} ya no se ofrece.` });
                      })
                    }
                  >
                    Dejar de ofrecer
                  </Button>
                </div>
                {confirmLast === s.id ? (
                  <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-alerta-fondo p-4 shadow-[inset_0_0_0_2px_var(--alerta)]">
                    <p className="inline-flex items-start gap-2 font-bold">
                      <TriangleAlert aria-hidden size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
                      Es el último servicio. La página de horarios va a mostrar &ldquo;Por ahora no hay turnos online&rdquo;.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="principal"
                        disabled={pending}
                        onClick={() => act(() => deactivateServiceAction(s.id, true).finally(() => setConfirmLast(null)), `${s.name} ya no se ofrece.`)}
                      >
                        Sí, dejar de ofrecerlo
                      </Button>
                      <Button variant="secundario" onClick={() => setConfirmLast(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Plate>
            </li>
          ),
        )}
      </ul>

      {editing === "new" ? (
        <ServiceEditor initial={toDraft(null, step)} step={step} onDone={(text) => (setEditing(null), text && setMessage({ ok: true, text }))} />
      ) : (
        <Button variant="secundario" className="self-start" onClick={() => (setEditing("new"), setMessage(null))}>
          <Plus aria-hidden size={20} strokeWidth={2.5} /> Agregar servicio
        </Button>
      )}

      {removed.length > 0 ? (
        <section aria-labelledby="titulo-sacados" className="flex flex-col gap-2">
          <h3 id="titulo-sacados" className="text-[16px] font-bold text-tinta-suave">
            No se ofrecen
          </h3>
          <ul className="flex flex-col gap-2">
            {removed.map((s) => (
              <li key={s.id}>
                <Plate className="flex items-center gap-3 px-5 py-3 opacity-80">
                  <p className="min-w-0 flex-1">
                    <span className="font-bold">{s.name}</span>
                    <span className="text-tinta-suave"> · no se ofrece · {formatDuration(s.durationMinutes)} · {formatPesos(s.priceCents)}</span>
                  </p>
                  <Button variant="secundario" className="shrink-0 px-3" disabled={pending} onClick={() => act(() => reactivateServiceAction(s.id), `${s.name} se vuelve a ofrecer.`)}>
                    <RotateCcw aria-hidden size={18} strokeWidth={2.5} /> Volver a ofrecer
                  </Button>
                </Plate>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ServiceEditor({ initial, step, onDone }: { initial: Draft; step: number; onDone: (savedText: string | null) => void }) {
  const [draft, setDraft] = useState(initial);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, run] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedGuard(`servicio-${initial.id ?? "nuevo"}`, dirty);
  const errors = result && !result.ok ? result.errors : {};
  const ids = { name: useId(), description: useId(), duration: useId(), price: useId() };
  const durations = Array.from({ length: Math.floor(SERVICE_LIMITS.maxDurationMinutes / step) }, (_, i) => (i + 1) * step);
  if (!durations.includes(draft.durationMinutes)) durations.push(draft.durationMinutes);
  durations.sort((a, b) => a - b);
  const set = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    setResult(null);
  };

  return (
    <Plate className={cx("flex flex-col gap-4 p-5")} aria-label={initial.id ? `Editar ${initial.name}` : "Servicio nuevo"}>
      <h3 className="text-[18px] font-bold">{initial.id ? `Editar ${initial.name}` : "Servicio nuevo"}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Field label="Nombre">
            <TextInput maxLength={SERVICE_LIMITS.nameLength + 10} aria-describedby={ids.name} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <FieldError id={ids.name}>{errors.name}</FieldError>
        </div>
        <div className="flex flex-col gap-1">
          <Field label="Qué incluye">
            <TextInput maxLength={SERVICE_LIMITS.descriptionLength + 10} aria-describedby={ids.description} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <FieldError id={ids.description}>{errors.description}</FieldError>
        </div>
        <div className="flex flex-col gap-1">
          <Field label="Duración" hint={`En pasos de ${step} minutos.`}>
            <Select aria-describedby={ids.duration} value={draft.durationMinutes} onChange={(e) => set({ durationMinutes: Number(e.target.value) })}>
              {durations.map((m) => (
                <option key={m} value={m}>
                  {formatDuration(m)}
                </option>
              ))}
            </Select>
          </Field>
          <FieldError id={ids.duration}>{errors.duration}</FieldError>
        </div>
        <div className="flex flex-col gap-1">
          <Field label="Precio">
            <MoneyInput
              aria-describedby={ids.price}
              value={draft.pesos}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                set({ pesos: digits ? Number(digits).toLocaleString("es-AR") : "" });
              }}
            />
          </Field>
          <FieldError id={ids.price}>{errors.price}</FieldError>
        </div>
      </div>
      <div className="border-y border-linea">
        <Switch label="Suma para beneficios" hint="Cuenta como visita y recibe los descuentos." checked={draft.countsForBenefits} onChange={(v) => set({ countsForBenefits: v })} />
      </div>
      <SaveBar
        label={initial.id ? "Guardar cambios" : "Agregar"}
        pending={pending}
        saved={false}
        dirty={dirty}
        error={errors.form}
        onSave={() =>
          run(async () => {
            const r = await saveServiceAction({ ...draft, pesos: Number(draft.pesos.replace(/\D/g, "") || 0) });
            setResult(r);
            if (r.ok) onDone(initial.id ? `Guardaste ${draft.name.trim()}.` : `Agregaste ${draft.name.trim()}.`);
          })
        }
      />
      <Button variant="texto" className="self-start text-tinta" onClick={() => onDone(null)} disabled={pending}>
        Cancelar
      </Button>
    </Plate>
  );
}
