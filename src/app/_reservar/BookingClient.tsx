"use client";

import { useEffect, useMemo, useState } from "react";
import type { Service } from "@/modules/pricing";
import { computeAvailability, snapshotInput, type ScheduleSnapshot } from "@/modules/schedule";
import { localDateOf, serverClock, type LocalDate } from "@/shared/kernel";
import { BookingView } from "./BookingView";

const TICK_MS = 30_000;

/**
 * Estado de la página de horarios (cambio 01). Calcula en el dispositivo con el dominio puro, a partir de
 * la foto de la agenda que mandó el servidor: elegir servicio, día o semana no viaja al servidor ni
 * cambia la dirección (RF-15). "Ahora" sale de la hora del servidor más el tiempo transcurrido, y se
 * actualiza cada 30 segundos (RF-16, caso 14).
 */
export function BookingClient({ services, snapshot }: { services: Service[]; snapshot: ScheduleSnapshot }) {
  const [serviceId, setServiceId] = useState(services[0]!.id);
  const [selection, setSelection] = useState<{ day: LocalDate | null; weekOf: LocalDate | null }>({ day: null, weekOf: null });
  // El primer render usa exactamente la hora del servidor: así coincide con el HTML del servidor (hidratación).
  const [nowMs, setNowMs] = useState(snapshot.serverNow);

  useEffect(() => {
    const now = serverClock(snapshot.serverNow);
    const id = setInterval(() => setNowMs(now().getTime()), TICK_MS);
    return () => clearInterval(id);
  }, [snapshot.serverNow]);

  const service = services.find((s) => s.id === serviceId) ?? services[0]!;
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const availability = useMemo(
    () => computeAvailability(snapshotInput(snapshot, service.durationMinutes, now), selection, snapshot.contactWhatsapp),
    [snapshot, service.durationMinutes, now, selection],
  );

  return (
    <BookingView
      services={services}
      service={service}
      availability={availability}
      today={localDateOf(now)}
      notices={snapshot.notices}
      actions={{
        onService: (id) => setServiceId(id), // se mantiene el día elegido
        onDay: (day) => setSelection({ day, weekOf: null }),
        onWeek: (weekOf) => setSelection({ day: null, weekOf }),
      }}
    />
  );
}
