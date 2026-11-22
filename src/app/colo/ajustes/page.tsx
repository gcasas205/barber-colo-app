import type { Metadata } from "next";
import { connection } from "next/server";
import { listAllServices } from "@/modules/pricing";
import { getScheduleSettings } from "@/modules/schedule";
import { getActor } from "@/server/auth/actor";
import { scheduleAdminDeps, serviceAdminDeps } from "@/server/settings";
import { localDateOf } from "@/shared/kernel";
import { DemoBanner } from "../../_sesion/DemoBanner";
import { NoAccess } from "../../_sesion/NoAccess";
import { AppFrame } from "../../_sesion/AppFrame";
import { BlocksSection } from "./BlocksSection";
import { BookingSection } from "./BookingSection";
import { HoursSection } from "./HoursSection";
import { ServicesSection } from "./ServicesSection";

/** Como /colo: ruta bloqueante, sin <Suspense>, con la CSP con nonce (spec 002, RNF-4). */
export const instant = false;

export const metadata: Metadata = { title: "Ajustes · El Colo", robots: { index: false } };

const SECTIONS = [
  ["horarios", "Horarios"],
  ["bloqueos", "Bloqueos"],
  ["servicios", "Servicios"],
  ["reservas", "Reservas y contacto"],
] as const;

export default async function SettingsPage() {
  await connection();
  const actor = await getActor();
  if (actor.kind !== "barber") return <NoAccess actor={actor} />; // RF-2

  const now = new Date();
  const [schedule, services] = await Promise.all([getScheduleSettings(scheduleAdminDeps(), actor, now), listAllServices(serviceAdminDeps(), actor)]);
  if (!schedule.ok || !services.ok) return <NoAccess actor={actor} />;
  const s = schedule.value;

  return (
    <AppFrame area="colo" current="/colo/ajustes" banner={actor.demo ? <DemoBanner /> : null}>
      <div className="flex flex-col gap-3">
        <h1 className="text-[28px] font-bold leading-tight">Ajustes</h1>
        <p className="text-tinta-suave">Lo que guardes se ve en la página de horarios la próxima vez que alguien la abra.</p>
        <nav aria-label="Secciones de Ajustes">
          <ul className="flex flex-wrap gap-2">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-chapa px-4 text-[15px] font-bold shadow-[inset_0_0_0_2px_var(--linea)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <section id="horarios" aria-labelledby="titulo-horarios" className="flex scroll-mt-6 flex-col gap-3">
        <h2 id="titulo-horarios" className="text-[22px] font-bold">
          Horarios
        </h2>
        <HoursSection ranges={s.ranges} step={s.config.stepMinutes} />
      </section>

      <section id="bloqueos" aria-labelledby="titulo-bloqueos" className="flex scroll-mt-6 flex-col gap-3">
        <h2 id="titulo-bloqueos" className="text-[22px] font-bold">
          Bloqueos
        </h2>
        <p className="text-tinta-suave">Feriados, vacaciones o un trámite: esos horarios dejan de ofrecerse.</p>
        <BlocksSection
          today={localDateOf(now)}
          blocks={s.blocks.map((b) => ({ id: b.id, start: b.start.toISOString(), end: b.end.toISOString(), notice: b.notice }))}
        />
      </section>

      <section id="servicios" aria-labelledby="titulo-servicios" className="flex scroll-mt-6 flex-col gap-3">
        <h2 id="titulo-servicios" className="text-[22px] font-bold">
          Servicios
        </h2>
        <p className="text-tinta-suave">Los cambios valen para las reservas nuevas.</p>
        <ServicesSection services={services.value} step={s.config.stepMinutes} />
      </section>

      <section id="reservas" aria-labelledby="titulo-reservas" className="flex scroll-mt-6 flex-col gap-3">
        <h2 id="titulo-reservas" className="text-[22px] font-bold">
          Reservas y contacto
        </h2>
        <BookingSection minNoticeMinutes={s.config.minNoticeMinutes} maxAdvanceDays={s.config.maxAdvanceDays} whatsapp={s.contactWhatsapp} />
      </section>
    </AppFrame>
  );
}
