"use client";

import { Megaphone, Plus, Trash2 } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { SETTINGS_LIMITS } from "@/modules/schedule";
import { parseMinute, type LocalDate } from "@/shared/kernel";
import { Button } from "@/ui/Button";
import { Field, TextInput } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { cx } from "@/ui/cx";
import { FieldError } from "../../_sesion/FormBits";
import { addBlockAction, removeBlockAction, type SaveResult } from "./actions";
import { describeBlock } from "./format";
import { AffectedList } from "./AffectedList";
import { SaveBar } from "./SaveBar";
import { useUnsavedGuard } from "./unsaved";

export type BlockItem = { id: string; start: string; end: string; notice: string | null };
type Draft = { kind: "days" | "hours"; first: string; last: string; from: string; to: string; notice: string };

/** RF-10 a RF-13: bloqueos vigentes y carga de uno nuevo, de días o de horas, con aviso opcional. */
export function BlocksSection({ blocks, today }: { blocks: BlockItem[]; today: LocalDate }) {
  const empty: Draft = { kind: "days", first: today, last: today, from: "10:00", to: "11:00", notice: "" };
  const [draft, setDraft] = useState(empty);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, run] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(empty);
  useUnsavedGuard("bloqueos", dirty);
  const errors = result && !result.ok ? result.errors : {};
  const ids = { dates: useId(), notice: useId() };
  const set = (patch: Partial<Draft>) => {
    setDraft({ ...draft, ...patch });
    setResult(null);
  };

  function save() {
    run(async () => {
      const r =
        draft.kind === "days"
          ? await addBlockAction({ kind: "days", first: draft.first, last: draft.last, notice: draft.notice })
          : await addBlockAction({ kind: "hours", day: draft.first, from: parseMinute(draft.from) ?? -1, to: parseMinute(draft.to) ?? -1, notice: draft.notice });
      setResult(r);
      if (r.ok) setDraft(empty);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Plate className="flex flex-col gap-3 p-5" aria-labelledby="titulo-vigentes">
        <h3 id="titulo-vigentes" className="text-[18px] font-bold">
          Bloqueos cargados
        </h3>
        {blocks.length === 0 ? (
          <p className="text-tinta-suave">No hay bloqueos. Se ofrecen todos los horarios de tus franjas.</p>
        ) : (
          <ul className="flex flex-col divide-y-2 divide-linea">
            {blocks.map((b) => {
              const text = describeBlock(new Date(b.start), new Date(b.end));
              return (
                <li key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="font-bold">{text}</p>
                    <p className="inline-flex items-center gap-1.5 text-[15px] text-tinta-suave">
                      {b.notice ? (
                        <>
                          <Megaphone aria-hidden size={16} strokeWidth={2.5} /> Aviso: {b.notice}
                        </>
                      ) : (
                        "Sin aviso para los clientes"
                      )}
                    </p>
                  </div>
                  <Button
                    variant="secundario"
                    className="shrink-0 px-3"
                    aria-label={`Borrar el bloqueo: ${text}`}
                    disabled={removing === b.id}
                    onClick={() => {
                      setRemoving(b.id);
                      run(async () => {
                        await removeBlockAction(b.id);
                        setRemoving(null);
                      });
                    }}
                  >
                    <Trash2 aria-hidden size={18} strokeWidth={2.5} />
                    <span className="hidden sm:inline">{removing === b.id ? "Borrando…" : "Borrar"}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Plate>

      <Plate className="flex flex-col gap-4 p-5" aria-labelledby="titulo-nuevo-bloqueo">
        <h3 id="titulo-nuevo-bloqueo" className="inline-flex items-center gap-2 text-[18px] font-bold">
          <Plus aria-hidden size={20} strokeWidth={2.5} /> Nuevo bloqueo
        </h3>
        <div role="radiogroup" aria-label="Tipo de bloqueo" className="grid grid-cols-2 gap-2">
          {(
            [
              ["days", "Días enteros"],
              ["hours", "Unas horas"],
            ] as const
          ).map(([kind, label]) => (
            <label
              key={kind}
              className={cx(
                "flex min-h-[52px] cursor-pointer items-center justify-center rounded-[var(--radius-control)] px-3 font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-poste",
                draft.kind === kind ? "bg-esmalte text-sobre-esmalte" : "bg-chapa shadow-[inset_0_0_0_2px_var(--linea)]",
              )}
            >
              <input type="radio" name="tipo-bloqueo" className="sr-only" checked={draft.kind === kind} onChange={() => set({ kind })} />
              {label}
            </label>
          ))}
        </div>
        {draft.kind === "days" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde el día">
              <TextInput type="date" min={today} aria-describedby={ids.dates} value={draft.first} onChange={(e) => set({ first: e.target.value, last: draft.last < e.target.value ? e.target.value : draft.last })} />
            </Field>
            <Field label="Hasta el día (incluido)">
              <TextInput type="date" min={draft.first} aria-describedby={ids.dates} value={draft.last} onChange={(e) => set({ last: e.target.value })} />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Día">
              <TextInput type="date" min={today} aria-describedby={ids.dates} value={draft.first} onChange={(e) => set({ first: e.target.value })} />
            </Field>
            <Field label="Desde">
              <TextInput type="time" step={300} aria-describedby={ids.dates} value={draft.from} onChange={(e) => set({ from: e.target.value })} />
            </Field>
            <Field label="Hasta">
              <TextInput type="time" step={300} aria-describedby={ids.dates} value={draft.to} onChange={(e) => set({ to: e.target.value })} />
            </Field>
          </div>
        )}
        <FieldError id={ids.dates}>{errors.dates}</FieldError>
        <Field label="Aviso para los clientes (opcional)" hint={`Se muestra en la página de horarios. Hasta ${SETTINGS_LIMITS.noticeLength} letras. Por ejemplo: Vacaciones.`}>
          <TextInput maxLength={SETTINGS_LIMITS.noticeLength + 20} aria-describedby={ids.notice} value={draft.notice} onChange={(e) => set({ notice: e.target.value })} />
        </Field>
        <FieldError id={ids.notice}>{errors.notice}</FieldError>
      <AffectedList items={result && !result.ok ? result.affected : undefined} />
        <SaveBar label="Bloquear" pending={pending && !removing} saved={!!result?.ok} dirty={dirty} canSave error={errors.form} onSave={save} />
      </Plate>
    </div>
  );
}
