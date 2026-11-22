"use client";

import { Copy, Plus, X } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import { ALLOWED_STEPS, copyDay, SETTINGS_LIMITS, type WeeklyRange } from "@/modules/schedule";
import type { IsoWeekday } from "@/shared/kernel";
import { Button } from "@/ui/Button";
import { Field, Select } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { FieldError } from "../../_sesion/FormBits";
import { changeStepAction, saveRangesAction, type SaveResult } from "./actions";
import { timeOptions } from "./format";
import { WEEKDAY_NAMES } from "./messages";
import { AffectedList } from "./AffectedList";
import { SaveBar } from "./SaveBar";
import { useUnsavedGuard } from "./unsaved";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as IsoWeekday[];
const sorted = (r: WeeklyRange[]) => [...r].sort((a, b) => a.weekday - b.weekday || a.opensAt - b.opensAt);

/** RF-4 a RF-9: franjas de la semana y paso de la agenda. */
export function HoursSection({ ranges: initialRanges, step: initialStep }: { ranges: WeeklyRange[]; step: number }) {
  return (
    <div className="flex flex-col gap-5">
      <RangesForm initial={initialRanges} step={initialStep} />
      <StepForm initial={initialStep} />
    </div>
  );
}

function RangesForm({ initial, step }: { initial: WeeklyRange[]; step: number }) {
  const [baseline, setBaseline] = useState(() => sorted(initial));
  const [ranges, setRanges] = useState(() => sorted(initial));
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const [copyFrom, setCopyFrom] = useState<IsoWeekday>(1);
  const [copyTo, setCopyTo] = useState<IsoWeekday[]>([]);
  const options = useMemo(() => timeOptions(step), [step]);
  const dirty = JSON.stringify(ranges) !== JSON.stringify(baseline);
  useUnsavedGuard("franjas", dirty);
  const errors = result && !result.ok ? result.errors : {};
  const errorBase = useId();

  const update = (next: WeeklyRange[]) => {
    setRanges(next);
    setResult(null);
  };
  const ofDay = (d: IsoWeekday) => ranges.map((r, i) => [r, i] as const).filter(([r]) => r.weekday === d);

  function addRange(d: IsoWeekday) {
    const last = ofDay(d).at(-1)?.[0];
    const opensAt = last ? Math.min(last.closesAt + 60, 1440 - step) : 600;
    const closesAt = Math.min(opensAt + 180, 1440);
    update(sorted([...ranges, { weekday: d, opensAt, closesAt }]));
  }

  function save() {
    start(async () => {
      const r = await saveRangesAction(ranges);
      setResult(r);
      if (r.ok) setBaseline(ranges);
    });
  }

  return (
    <Plate className="flex flex-col gap-5 p-5" aria-labelledby="titulo-franjas">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-franjas" className="text-[18px] font-bold">
          Días y horarios en que atendés
        </h3>
        <p className="text-[15px] text-tinta-suave">Hasta {SETTINGS_LIMITS.rangesPerDay} franjas por día. Las horas van de {step} en {step} minutos.</p>
      </div>
      <ul className="flex flex-col divide-y-2 divide-linea">
        {DAYS.map((d) => {
          const items = ofDay(d);
          const errorId = `${errorBase}-${d}`;
          return (
            <li key={d} className="flex flex-col gap-2 py-3 first:pt-0" aria-label={WEEKDAY_NAMES[d]}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{WEEKDAY_NAMES[d]}</p>
                {items.length === 0 ? <p className="text-tinta-suave">No atiende</p> : null}
              </div>
              {items.map(([r, i], n) => (
                <div key={i} className="flex items-end gap-2">
                  <Field label="Abre">
                    <Select
                      aria-label={`${WEEKDAY_NAMES[d]}, franja ${n + 1}, abre`}
                      aria-describedby={errorId}
                      value={r.opensAt}
                      onChange={(e) => update(ranges.map((x, j) => (j === i ? { ...x, opensAt: Number(e.target.value) } : x)))}
                    >
                      {options.slice(0, -1).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cierra">
                    <Select
                      aria-label={`${WEEKDAY_NAMES[d]}, franja ${n + 1}, cierra`}
                      aria-describedby={errorId}
                      value={r.closesAt}
                      onChange={(e) => update(ranges.map((x, j) => (j === i ? { ...x, closesAt: Number(e.target.value) } : x)))}
                    >
                      {options.slice(1).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button
                    variant="secundario"
                    className="shrink-0 px-3"
                    aria-label={`Sacar la franja ${n + 1} del ${WEEKDAY_NAMES[d].toLowerCase()}`}
                    onClick={() => update(ranges.filter((_, j) => j !== i))}
                  >
                    <X aria-hidden size={20} strokeWidth={2.5} />
                  </Button>
                </div>
              ))}
              <FieldError id={errorId}>{errors[`day-${d}`]}</FieldError>
              {items.length < SETTINGS_LIMITS.rangesPerDay ? (
                <Button variant="texto" className="self-start" onClick={() => addRange(d)}>
                  <Plus aria-hidden size={18} strokeWidth={2.5} /> Agregar franja al {WEEKDAY_NAMES[d].toLowerCase()}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <fieldset className="flex flex-col gap-3 rounded-[var(--radius-control)] p-4 shadow-[inset_0_0_0_2px_var(--linea)]">
        <legend className="px-1 font-bold">Copiar franjas de un día a otros</legend>
        <Field label="Copiar las franjas del">
          <Select value={copyFrom} onChange={(e) => setCopyFrom(Number(e.target.value) as IsoWeekday)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_NAMES[d]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label="A estos días">
          {DAYS.filter((d) => d !== copyFrom).map((d) => (
            <label key={d} className="inline-flex min-h-[44px] items-center gap-2">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--esmalte)]"
                checked={copyTo.includes(d)}
                onChange={(e) => setCopyTo(e.target.checked ? [...copyTo, d] : copyTo.filter((x) => x !== d))}
              />
              {WEEKDAY_NAMES[d]}
            </label>
          ))}
        </div>
        <Button
          variant="secundario"
          className="self-start"
          disabled={copyTo.filter((d) => d !== copyFrom).length === 0}
          onClick={() => {
            update(copyDay(ranges, copyFrom, copyTo));
            setCopyTo([]);
          }}
        >
          <Copy aria-hidden size={18} strokeWidth={2.5} /> Copiar
        </Button>
      </fieldset>

      <AffectedList items={result && !result.ok ? result.affected : undefined} />
      <SaveBar label="Guardar horarios" pending={pending} saved={!!result?.ok} dirty={dirty} error={errors.form} onSave={save} />
    </Plate>
  );
}

function StepForm({ initial }: { initial: number }) {
  const [baseline, setBaseline] = useState(initial);
  const [step, setStep] = useState(initial);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = step !== baseline;
  useUnsavedGuard("paso", dirty);
  const errorId = useId();
  const error = result && !result.ok ? result.errors.step : undefined;

  return (
    <Plate className="flex flex-col gap-4 p-5" aria-labelledby="titulo-paso">
      <h3 id="titulo-paso" className="text-[18px] font-bold">
        Paso de la agenda
      </h3>
      <Field label="Los turnos empiezan cada" hint="Las duraciones de los servicios y las horas de las franjas tienen que coincidir con el paso.">
        <Select
          value={step}
          aria-describedby={errorId}
          onChange={(e) => {
            setStep(Number(e.target.value));
            setResult(null);
          }}
        >
          {ALLOWED_STEPS.map((s) => (
            <option key={s} value={s}>
              {s} minutos
            </option>
          ))}
        </Select>
      </Field>
      <FieldError id={errorId}>{error}</FieldError>
      <SaveBar
        label="Guardar paso"
        pending={pending}
        saved={!!result?.ok}
        dirty={dirty}
        onSave={() =>
          start(async () => {
            const r = await changeStepAction(step);
            setResult(r);
            if (r.ok) setBaseline(step);
          })
        }
      />
    </Plate>
  );
}
