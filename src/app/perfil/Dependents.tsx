"use client";

import { CircleCheck, Pencil, Plus, TriangleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/ui/Button";
import { Field, Select, TextInput } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { FieldError, FormAlert } from "../_sesion/FormBits";
import { errorText } from "../_sesion/messages";
import { addDependentAction, removeDependentAction, updateDependentAction, type DependentResult } from "./actions";
import { MONTHS } from "./ProfileForm";

export type DependentItem = { id: string; name: string; birthDay: number | null; birthMonth: number | null };

const MESSAGES: Record<string, string> = {
  LIMIT: "Ya tenés 5 personas a cargo, que es el máximo.",
  TRY_AGAIN: "No pudimos completar el pedido. Probá de nuevo.",
};

/**
 * Spec 004b, RF-1 a RF-6: "Personas a cargo" en Mi perfil. Agregar, editar en el lugar y quitar; a quien
 * tiene un turno futuro no se lo quita: se muestra el turno para cancelarlo antes.
 */
export function Dependents({ items, upcoming, limit }: { items: DependentItem[]; upcoming: Record<string, string>; limit: number }) {
  // La lista cambia enseguida con lo que devuelve el servidor; cuando llega la de la página (otro arreglo), manda esa.
  const [override, setOverride] = useState<{ base: DependentItem[]; items: DependentItem[] } | null>(null);
  const list = override && override.base === items ? override.items : items;
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const commit = (next: DependentItem[], text: string) => {
    setOverride({ base: items, items: next });
    setMessage(text);
    startRefresh(() => router.refresh());
  };
  const full = list.length >= limit;

  return (
    <section aria-labelledby="titulo-a-cargo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-a-cargo" className="text-[22px] font-bold">
          Personas a cargo
        </h2>
        <p className="text-tinta-suave">Hijos u otras personas a las que les sacás turno. Hasta {limit}.</p>
      </div>
      {message ? (
        <p role="status" className="inline-flex items-center gap-2 font-bold text-ok">
          <CircleCheck aria-hidden size={20} strokeWidth={2.5} /> {message}
        </p>
      ) : null}
      {list.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {list.map((d) => (
            <li key={d.id}>
              <DependentRow
                item={d}
                upcoming={upcoming[d.id] ?? null}
                onSaved={(next) => commit(list.map((x) => (x.id === d.id ? next : x)), "Guardado")}
                onRemoved={() => commit(list.filter((x) => x.id !== d.id), `Quitaste a ${d.name}.`)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {adding ? (
        <Plate className="p-5">
          <DependentForm
            title="Agregar persona"
            submitLabel="Agregar"
            onCancel={() => setAdding(false)}
            onSubmit={(input) => addDependentAction(input)}
            onDone={(d) => (setAdding(false), commit([...list, d], `Agregaste a ${d.name}.`))}
          />
        </Plate>
      ) : full ? (
        <p className="text-tinta-suave">{MESSAGES.LIMIT}</p>
      ) : (
        <Button variant="secundario" className="self-start" onClick={() => (setMessage(null), setAdding(true))}>
          <Plus aria-hidden size={20} strokeWidth={2.5} /> Agregar persona
        </Button>
      )}
    </section>
  );
}

const birthdayText = (d: DependentItem) => (d.birthDay && d.birthMonth ? `Cumple el ${d.birthDay} de ${MONTHS[d.birthMonth - 1]}` : "Sin cumpleaños cargado");

function DependentRow({
  item,
  upcoming,
  onSaved,
  onRemoved,
}: {
  item: DependentItem;
  upcoming: string | null;
  onSaved: (d: DependentItem) => void;
  onRemoved: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "remove">("view");
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useTransition();

  if (mode === "edit") {
    return (
      <Plate className="p-5">
        <DependentForm
          title={`Editar a ${item.name}`}
          submitLabel="Guardar"
          defaults={item}
          onCancel={() => setMode("view")}
          onSubmit={(input) => updateDependentAction(item.id, input)}
          onDone={(d) => (setMode("view"), onSaved(d))}
        />
      </Plate>
    );
  }

  function remove() {
    run(async () => {
      const r = await removeDependentAction(item.id);
      if (r.ok) return onRemoved();
      if (r.error === "HAS_UPCOMING") return setBlocked(true);
      setError(MESSAGES.TRY_AGAIN!);
    });
  }

  // RF-6: con un turno futuro, en vez de confirmar se muestra el turno y cómo cancelarlo.
  const hasTurno = blocked || !!upcoming;
  return (
    <Plate className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <UserRound aria-hidden size={22} strokeWidth={2.5} className="mt-0.5 shrink-0 text-tinta-suave" />
        <div className="flex flex-col">
          <p className="text-[18px] font-bold">{item.name}</p>
          <p className="text-[15px] text-tinta-suave">{birthdayText(item)}</p>
          {upcoming ? <p className="text-[15px]">Turno: {upcoming}</p> : null}
        </div>
      </div>
      {error ? <FormAlert title="No se pudo">{error}</FormAlert> : null}
      {mode === "remove" ? (
        hasTurno ? (
          <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-alerta-fondo p-4 shadow-[inset_0_0_0_2px_var(--alerta)]">
            <p className="inline-flex items-start gap-2 font-bold">
              <TriangleAlert aria-hidden size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
              {upcoming
                ? `${item.name} tiene un turno el ${upcoming}. Para quitarlo, primero cancelá ese turno.`
                : `${item.name} tiene un turno reservado. Para quitarlo, primero cancelá ese turno.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/turnos"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-control)] bg-esmalte px-4 font-bold text-sobre-esmalte focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste"
              >
                Ir a los turnos
              </Link>
              <Button variant="secundario" onClick={() => (setBlocked(false), setMode("view"))}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-alerta-fondo p-4 shadow-[inset_0_0_0_2px_var(--alerta)]">
            <p className="font-bold">¿Quitás a {item.name}? Ya no vas a poder sacarle turnos.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="esmalte" disabled={pending} onClick={remove}>
                {pending ? "Quitando…" : "Sí, quitar"}
              </Button>
              <Button variant="secundario" disabled={pending} onClick={() => setMode("view")}>
                No
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="secundario" aria-label={`Editar a ${item.name}`} onClick={() => (setError(null), setMode("edit"))}>
            <Pencil aria-hidden size={18} strokeWidth={2.5} /> Editar
          </Button>
          <Button variant="texto" aria-label={`Quitar a ${item.name}`} onClick={() => (setError(null), setMode("remove"))}>
            Quitar
          </Button>
        </div>
      )}
    </Plate>
  );
}

function DependentForm({
  title,
  submitLabel,
  defaults,
  onCancel,
  onSubmit,
  onDone,
}: {
  title: string;
  submitLabel: string;
  defaults?: DependentItem;
  onCancel: () => void;
  onSubmit: (input: { name: string; birthDay: number | null; birthMonth: number | null }) => Promise<DependentResult>;
  onDone: (d: DependentItem) => void;
}) {
  const [name, setName] = useState(defaults?.name ?? "");
  const [day, setDay] = useState<string>(defaults?.birthDay ? String(defaults.birthDay) : "");
  const [month, setMonth] = useState<string>(defaults?.birthMonth ? String(defaults.birthMonth) : "");
  const [result, setResult] = useState<DependentResult | null>(null);
  const [pending, run] = useTransition();
  const fields = result && !result.ok ? (result.fields ?? {}) : {};
  const formError = result && !result.ok && !result.fields ? (MESSAGES[result.error] ?? MESSAGES.TRY_AGAIN) : null;
  const ids = `dep-${defaults?.id ?? "nueva"}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const r = await onSubmit({ name, birthDay: day ? Number(day) : null, birthMonth: month ? Number(month) : null });
      setResult(r);
      if (r.ok && r.dependent) onDone(r.dependent);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate aria-label={title}>
      <h3 className="text-[19px] font-bold">{title}</h3>
      {formError ? <FormAlert title="No pudimos guardar">{formError}</FormAlert> : null}
      <Field label="Nombre">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" aria-invalid={!!fields.name} aria-describedby={`${ids}-error-nombre`} disabled={pending} />
      </Field>
      <FieldError id={`${ids}-error-nombre`}>{errorText(fields.name)}</FieldError>
      <fieldset className="flex flex-col gap-1.5" aria-describedby={`${ids}-error-cumple`}>
        <legend className="text-[15px] font-bold">Cumpleaños (opcional)</legend>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <Select aria-label="Día" value={day} onChange={(e) => setDay(e.target.value)} disabled={pending}>
            <option value="">Día</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </Select>
          <Select aria-label="Mes" value={month} onChange={(e) => setMonth(e.target.value)} disabled={pending}>
            <option value="">Mes</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>
      <FieldError id={`${ids}-error-cumple`}>{errorText(fields.birthday)}</FieldError>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="esmalte" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button type="button" variant="secundario" disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
