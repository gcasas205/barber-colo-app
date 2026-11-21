"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, CalendarPlus, House, Scissors, UserRound } from "lucide-react";
import { AppHeader } from "@/ui/AppHeader";
import { BottomNav } from "@/ui/BottomNav";
import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";
import { PoleBand } from "@/ui/PoleBand";
import { cx } from "@/ui/cx";
import { DAYS, FREE_SLOTS, RATE, pesos } from "../_data";

const NAV = [
  { href: "/prototipo/cliente", label: "Inicio", icon: House },
  { href: "/prototipo/reservar", label: "Reservar", icon: CalendarPlus, current: true },
  { href: "#mis-turnos", label: "Mis turnos", icon: Scissors },
  { href: "#perfil", label: "Perfil", icon: UserRound },
];

const PEOPLE = [
  { id: "yo", label: "Para mí", detail: "Martín", discount: 0.1 },
  { id: "tomi", label: "Para Tomi", detail: "Tomás", discount: 0 },
];

/** Grupos de la grilla de horarios. */
function splitByTime(slots: string[]) {
  return {
    mañana: slots.filter((s) => Number(s.slice(0, 2)) < 14),
    tarde: slots.filter((s) => Number(s.slice(0, 2)) >= 14),
  };
}

export default function BookPrototype() {
  const [person, setPerson] = useState("yo");
  const [dayId, setDayId] = useState<string>("jue-26");
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  const day = DAYS.find((d) => d.id === dayId)!;
  const who = PEOPLE.find((p) => p.id === person)!;
  const finalPrice = Math.round(RATE * (1 - who.discount));
  const groups = splitByTime(FREE_SLOTS[dayId] ?? []);

  if (booked && slot) {
    return (
      <>
        <AppHeader title="Turno reservado" />
        <main className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-6">
          <Plate tone="esmalte" className="overflow-hidden" aria-live="polite">
            <PoleBand className="h-3" />
            <div className="flex flex-col gap-3 p-5">
              <h1 className="text-[22px] font-bold">¡Listo, te esperamos!</h1>
              <p className="cifra text-[40px] leading-none">
                {day.short} {day.day} · {slot}
              </p>
              <p className="text-sobre-esmalte-suave">
                {who.id === "yo" ? "Para vos" : "Para Tomi"} · {pesos(finalPrice)}
              </p>
            </div>
          </Plate>
          <Plate className="flex flex-col gap-2 px-5 py-4">
            <h2 className="font-bold">Lo que sigue</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-tinta-suave">
              <li>El día anterior a las 20:00 te mandamos un recordatorio.</li>
              <li>Una hora antes te pedimos que confirmes. Tenés 30 minutos.</li>
              <li>Podés cancelar o cambiar el horario sin problema hasta 4 horas antes.</li>
            </ul>
          </Plate>
          <Link
            href="/prototipo/cliente"
            className="flex min-h-[56px] items-center justify-center rounded-[var(--radius-control)] bg-esmalte text-[18px] font-bold text-sobre-esmalte"
          >
            Volver al inicio
          </Link>
          <p className="text-[14px] text-tinta-suave">Datos de ejemplo.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Reservar" back="/prototipo/cliente" />
      <main className="flex flex-1 flex-col gap-7 px-4 pb-6 pt-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-[20px] font-bold">¿Para quién es?</legend>
          <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-chapa)] bg-esmalte-100 p-1.5">
            {PEOPLE.map((p) => (
              <label
                key={p.id}
                className={cx(
                  "flex min-h-[52px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-control)] text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-poste",
                  person === p.id ? "bg-esmalte text-sobre-esmalte shadow-[var(--shadow-chapa)]" : "text-tinta",
                )}
              >
                <input
                  type="radio"
                  name="persona"
                  value={p.id}
                  checked={person === p.id}
                  onChange={() => setPerson(p.id)}
                  className="sr-only"
                />
                <span className="text-[17px] font-bold">{p.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col">
          <legend className="mb-3 text-[20px] font-bold">Día</legend>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {DAYS.map((d) => {
              const full = d.free === 0;
              const selected = d.id === dayId;
              const busy = d.total - d.free;
              return (
                <label
                  key={d.id}
                  className={cx(
                    "flex w-[78px] shrink-0 flex-col items-center gap-1.5 rounded-[var(--radius-chapa)] px-2 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-poste",
                    full && "cursor-not-allowed opacity-60",
                    !full && "cursor-pointer",
                    selected
                      ? "bg-esmalte text-sobre-esmalte shadow-[var(--shadow-chapa)]"
                      : "bg-chapa text-tinta shadow-[var(--shadow-chapa-clara)]",
                  )}
                >
                  <input
                    type="radio"
                    name="dia"
                    value={d.id}
                    disabled={full}
                    checked={selected}
                    onChange={() => {
                      setDayId(d.id);
                      setSlot(null);
                    }}
                    className="sr-only"
                  />
                  <span className="letras-chapa text-[13px]">{d.short}</span>
                  <span className="cifra text-[26px] leading-none">{d.day}</span>
                  <span
                    aria-hidden
                    className={cx("h-1.5 w-full overflow-hidden rounded-full", selected ? "bg-esmalte-700" : "bg-esmalte-100")}
                  >
                    <span
                      className={cx("block h-full rounded-full", selected ? "bg-sobre-esmalte" : "bg-esmalte")}
                      style={{ width: `${(busy / d.total) * 100}%` }}
                    />
                  </span>
                  <span className={cx("text-[13px] font-bold", selected ? "text-sobre-esmalte-suave" : "text-tinta-suave")}>
                    {full ? "Completo" : `${d.free} libres`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-[20px] font-bold">{day.long} · horarios libres</legend>
          {(["mañana", "tarde"] as const).map((part) =>
            groups[part].length ? (
              <div key={part} className="flex flex-col gap-2">
                <p className="text-[15px] font-bold capitalize text-tinta-suave">{part}</p>
                <div className="grid grid-cols-3 gap-2">
                  {groups[part].map((s) => (
                    <label
                      key={s}
                      className={cx(
                        "cifra grid min-h-[56px] cursor-pointer place-items-center rounded-[var(--radius-control)] text-[21px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-poste",
                        slot === s
                          ? "bg-esmalte text-sobre-esmalte shadow-[var(--shadow-chapa)]"
                          : "bg-chapa text-tinta shadow-[var(--shadow-chapa-clara)] hover:shadow-[inset_0_0_0_2px_var(--esmalte-200)]",
                      )}
                    >
                      <input
                        type="radio"
                        name="horario"
                        value={s}
                        checked={slot === s}
                        onChange={() => setSlot(s)}
                        className="sr-only"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </fieldset>
        <p className="text-[14px] text-tinta-suave">Datos de ejemplo.</p>
      </main>

      <div className="sticky bottom-[64px] z-10 border-t border-linea bg-chapa px-4 py-3 shadow-[0_-10px_20px_-16px_rgb(14_23_41/0.5)]">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="font-bold">
            {slot ? `${day.short} ${day.day} · ${slot}` : "Elegí un horario"}
            <span className="font-normal text-tinta-suave"> · {who.id === "yo" ? "para vos" : "para Tomi"}</span>
          </p>
          <p className="cifra text-[19px]">{pesos(finalPrice)}</p>
        </div>
        <Button variant="principal" className="w-full" disabled={!slot} onClick={() => setBooked(true)}>
          <CalendarCheck aria-hidden size={22} strokeWidth={2.5} />
          {slot ? `Reservar ${slot}` : "Reservar"}
        </Button>
      </div>
      <BottomNav items={NAV} />
    </>
  );
}
