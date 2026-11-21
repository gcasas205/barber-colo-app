"use client";

import { useState } from "react";
import { BarChart3, CalendarDays, Pencil, Plus, Settings, Sun, UsersRound } from "lucide-react";
import { AppHeader } from "@/ui/AppHeader";
import { AppShell } from "@/ui/AppShell";
import { Button } from "@/ui/Button";
import { Field, MoneyInput, Select, Switch, TextInput } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { cx } from "@/ui/cx";
import { SERVICES, STEP, pesos, type Service } from "../_data";

const NAV = [
  { href: "/prototipo/barbero", label: "Hoy", icon: Sun },
  { href: "#agenda", label: "Agenda", icon: CalendarDays },
  { href: "#clientes", label: "Clientes", icon: UsersRound },
  { href: "#numeros", label: "Números", icon: BarChart3 },
  { href: "/prototipo/ajustes", label: "Ajustes", icon: Settings, current: true },
];

type Editable = Service & { active: boolean };

const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * STEP);

function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function ServicesSettings() {
  const [services, setServices] = useState<Editable[]>(SERVICES.map((s) => ({ ...s, active: true })));
  const [editing, setEditing] = useState<string | null>("claritos");
  const [draft, setDraft] = useState<Editable | null>(services.find((s) => s.id === "claritos") ?? null);
  const [saved, setSaved] = useState<string | null>(null);

  function startEdit(s: Editable) {
    setEditing(s.id);
    setDraft({ ...s });
    setSaved(null);
  }

  function save() {
    if (!draft) return;
    setServices((list) => list.map((s) => (s.id === draft.id ? draft : s)));
    setSaved(draft.name);
    setEditing(null);
    setDraft(null);
  }

  return (
    <AppShell nav={NAV}>
      <AppHeader title="Ajustes" unread={2} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-6 lg:px-8 lg:pt-10">
        <div className="flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight">Servicios</h1>
          <p className="text-tinta-suave">
            Lo que tus clientes pueden reservar. Los cambios valen para las reservas nuevas: los turnos ya
            reservados conservan su precio y su duración.
          </p>
        </div>

        {saved && (
          <p role="status" className="rounded-[var(--radius-control)] bg-ok-fondo px-4 py-3 font-bold text-ok">
            Guardaste {saved}.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {services.map((s) =>
            editing === s.id && draft ? (
              <li key={s.id}>
                <Plate className="flex flex-col gap-5 p-5" aria-label={`Editar ${s.name}`}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre">
                      <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </Field>
                    <Field label="Qué incluye">
                      <TextInput
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      />
                    </Field>
                    <Field label="Duración" hint={`En pasos de ${STEP} minutos.`}>
                      <Select
                        value={draft.minutes}
                        onChange={(e) => setDraft({ ...draft, minutes: Number(e.target.value) })}
                      >
                        {DURATIONS.map((m) => (
                          <option key={m} value={m}>
                            {duration(m)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Precio">
                      <MoneyInput
                        value={draft.price.toLocaleString("es-AR")}
                        onChange={(e) => setDraft({ ...draft, price: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-col divide-y divide-linea border-y border-linea">
                    <Switch
                      label="Suma para beneficios"
                      hint="Cuenta como visita y recibe los descuentos."
                      checked={draft.countsForBenefits}
                      onChange={(v) => setDraft({ ...draft, countsForBenefits: v })}
                    />
                    <Switch
                      label="Se puede reservar"
                      hint="Si lo apagás, deja de ofrecerse. Los turnos ya reservados siguen."
                      checked={draft.active}
                      onChange={(v) => setDraft({ ...draft, active: v })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="principal" onClick={save} className="min-w-[180px]">
                      Guardar cambios
                    </Button>
                    <Button variant="texto" className="text-tinta" onClick={() => setEditing(null)}>
                      Cancelar
                    </Button>
                  </div>
                </Plate>
              </li>
            ) : (
              <li key={s.id}>
                <Plate className={cx("flex items-center gap-4 px-5 py-4", !s.active && "opacity-70")}>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[18px] font-bold">
                      {s.name}
                      {!s.active && <span className="font-normal text-tinta-suave"> · no se ofrece</span>}
                    </p>
                    <p className="text-[15px] text-tinta-suave">
                      {s.description} · {duration(s.minutes)}
                      {s.countsForBenefits ? " · suma para beneficios" : " · no suma para beneficios"}
                    </p>
                  </div>
                  <p className="cifra shrink-0 text-[19px]">{pesos(s.price)}</p>
                  <Button variant="secundario" aria-label={`Editar ${s.name}`} onClick={() => startEdit(s)} className="px-3">
                    <Pencil aria-hidden size={18} strokeWidth={2.5} />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                </Plate>
              </li>
            ),
          )}
        </ul>

        <Button variant="esmalte" className="self-start">
          <Plus aria-hidden size={20} strokeWidth={2.75} />
          Agregar servicio
        </Button>
        <p className="text-[14px] text-tinta-suave">Datos de ejemplo.</p>
        </div>
      </main>
    </AppShell>
  );
}
