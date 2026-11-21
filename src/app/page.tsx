import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { queries } from "@/server/composition";
import { BrandLoader } from "@/ui/brand/BrandLoader";
import { BookingClient } from "./_reservar/BookingClient";
import { NoServices, SoonNotice } from "./_reservar/Notices";
import { PublicHeader } from "./_reservar/PublicHeader";
import { SiteFooter } from "./_reservar/SiteFooter";

export const metadata: Metadata = {
  title: "Horarios libres · El Colo, Barbería y Peluquería",
  description: "Mirá qué horarios tiene libres Colo para corte, completo y claritos.",
};

const MAIN = "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-4 pb-12 pt-6 lg:px-8 lg:pt-10";

/**
 * Página pública (spec 001, cambio 01). La cabecera sale en el prerenderizado; la foto de la agenda se
 * pide una vez por visita detrás de Suspense, con el loader de El Colo mientras llega (RF-19).
 * Después, todo se calcula en el dispositivo (RF-15).
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <Suspense
        fallback={
          <main className={MAIN}>
            <div className="grid flex-1 place-items-center py-16">
              <BrandLoader label="Buscando horarios…" />
            </div>
          </main>
        }
      >
        <Schedule />
      </Suspense>
    </div>
  );
}

async function Schedule() {
  await connection(); // "ahora" es el del pedido, nunca el del build
  const q = queries();
  const [services, snapshot] = await Promise.all([q.listServices(), q.getScheduleSnapshot(new Date())]);
  return (
    <>
      <main className={MAIN}>
        {services.length === 0 ? (
          <NoServices whatsapp={snapshot.contactWhatsapp} />
        ) : (
          <>
            <SoonNotice whatsapp={snapshot.contactWhatsapp} />
            <BookingClient services={services} snapshot={snapshot} />
          </>
        )}
      </main>
      <SiteFooter whatsapp={snapshot.contactWhatsapp} />
    </>
  );
}
