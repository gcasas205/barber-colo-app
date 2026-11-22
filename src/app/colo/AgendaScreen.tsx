"use client";

import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, formatDayLong, formatDayShort, type LocalDate } from "@/shared/kernel";
import { BrandLoader } from "@/ui/brand/BrandLoader";
import { AgendaDay, type AgendaBlock, type AgendaTurno } from "./AgendaDay";
import { loadAgendaDayAction, markAgendaSeenAction } from "./agenda-actions";

export type AgendaData = {
  day: LocalDate;
  turnos: AgendaTurno[];
  blocks: AgendaBlock[];
  newElsewhere: { date: LocalDate; count: number }[];
};

const ARROW =
  "grid min-h-[52px] min-w-[52px] place-items-center rounded-[var(--radius-control)] bg-chapa shadow-[inset_0_0_0_2px_var(--linea)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste active:scale-[0.97]";
/** Una agenda armada hace menos que esto no se vuelve a pedir al mostrarse. */
const FRESH_MS = 5_000;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Agenda de Colo (spec 004, RF-21 a RF-26). Cambiar de día no recarga la pantalla: el día anterior y el
 * siguiente se precargan de fondo, así las flechas responden al instante. El día en pantalla se marca
 * como visto (RF-23); precargar no lo marca.
 */
export function AgendaScreen({ initial, today, renderedAt }: { initial: AgendaData; today: LocalDate; renderedAt: number }) {
  const cache = useRef(new Map<LocalDate, AgendaData>([[initial.day, initial]]));
  const loading = useRef(new Map<LocalDate, Promise<AgendaData | null>>());
  const [data, setData] = useState(initial);
  const [pendingDay, setPendingDay] = useState<LocalDate | null>(null);

  const load = useCallback((day: LocalDate, fresh = false) => {
    if (!fresh) {
      const cached = cache.current.get(day);
      if (cached) return Promise.resolve(cached);
      const inFlight = loading.current.get(day);
      if (inFlight) return inFlight;
    }
    const p = loadAgendaDayAction(day).then((d) => {
      loading.current.delete(day);
      if (d) cache.current.set(day, d);
      return d;
    });
    loading.current.set(day, p);
    return p;
  }, []);

  const day = data.day;
  // Las pestañas vuelven a mostrar la agenda guardada al instante (Next conserva la pantalla y el router la
  // guarda `staleTimes.dynamic`): al volver a verla, el día se pide de nuevo de fondo y los demás se olvidan,
  // así un turno que entró mientras Colo estaba en otra pestaña aparece enseguida.
  const shownOnce = useRef(false);
  useEffect(() => {
    const again = shownOnce.current || Date.now() - renderedAt > FRESH_MS;
    shownOnce.current = true;
    if (!again) return;
    cache.current = new Map(cache.current.has(day) ? [[day, cache.current.get(day)!]] : []);
    void load(day, true).then((d) => d && setData((cur) => (cur.day === d.day ? d : cur)));
    // Solo al mostrarse: el cambio de día tiene su propio efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // El día en pantalla: queda visto, la dirección lo recuerda y se precargan los vecinos.
  useEffect(() => {
    void markAgendaSeenAction(day);
    window.history.replaceState(null, "", day === today ? "/colo" : `/colo?dia=${day}`);
    // Dos días para cada lado: tocando la flecha seguido, el siguiente ya está.
    const id = window.setTimeout(() => {
      for (const n of [1, -1, 2, -2]) void load(addDays(day, n));
    }, 150);
    return () => window.clearTimeout(id);
  }, [day, today, load]);

  async function go(next: LocalDate) {
    const cached = cache.current.get(next);
    if (cached) return setData(cached);
    setPendingDay(next);
    const d = await load(next);
    setPendingDay((p) => (p === next ? null : p));
    if (d) setData(d);
  }

  /** Después de cancelar o mover: se vuelve a pedir el día (y el destino, si se movió a otro). */
  async function refresh(otherDay?: LocalDate) {
    if (otherDay && otherDay !== day) cache.current.delete(otherDay);
    const d = await load(day, true);
    if (d) setData(d);
  }

  const shown = pendingDay ?? day;
  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" className={ARROW} aria-label="Día anterior" onClick={() => go(addDays(shown, -1))}>
          <ChevronLeft aria-hidden size={24} strokeWidth={2.5} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center" aria-live="polite">
          <h1 className="text-[24px] font-bold leading-tight">{shown === today ? "Hoy" : cap(formatDayLong(shown))}</h1>
          {shown === today ? <p className="text-tinta-suave">{cap(formatDayLong(shown))}</p> : null}
        </div>
        <button type="button" className={ARROW} aria-label="Día siguiente" onClick={() => go(addDays(shown, 1))}>
          <ChevronRight aria-hidden size={24} strokeWidth={2.5} />
        </button>
      </div>
      {shown !== today ? (
        <button type="button" onClick={() => go(today)} className="min-h-[44px] self-center font-bold underline decoration-2 underline-offset-4">
          Volver a hoy
        </button>
      ) : null}
      {data.newElsewhere.filter((n) => n.date !== shown).length > 0 ? (
        <section aria-labelledby="titulo-nuevos" className="flex flex-col gap-2 rounded-[var(--radius-chapa)] bg-chapa px-4 py-3 shadow-[inset_0_0_0_3px_var(--espera)]">
          <h2 id="titulo-nuevos" className="inline-flex items-center gap-2 font-bold">
            <Sparkles aria-hidden size={18} strokeWidth={2.5} /> Turnos nuevos en otros días
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {data.newElsewhere
              .filter((n) => n.date !== shown)
              .map((n) => (
                <li key={n.date}>
                  <button type="button" onClick={() => go(n.date)} className="inline-flex min-h-[44px] items-center font-bold underline decoration-2 underline-offset-4">
                    {cap(formatDayShort(n.date))}: {n.count === 1 ? "1 turno" : `${n.count} turnos`}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
      {pendingDay ? (
        <div className="grid place-items-center py-10">
          <BrandLoader label="Buscando turnos…" />
        </div>
      ) : (
        <AgendaDay key={day} day={day} turnos={data.turnos} blocks={data.blocks} onChanged={refresh} />
      )}
    </>
  );
}
