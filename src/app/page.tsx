import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { queries } from "@/server/composition";
import { localDateOf } from "@/shared/kernel";
import { BrandLoader } from "@/ui/brand/BrandLoader";
import { BookingView } from "./_reservar/BookingView";
import { NoServices, SoonNotice } from "./_reservar/Notices";
import { PublicHeader } from "./_reservar/PublicHeader";
import { parseBookingSearch } from "./_reservar/search";

export const metadata: Metadata = {
  title: "Horarios libres · El Colo, Barbería y Peluquería",
  description: "Mirá qué horarios tiene libres Colo para corte, completo y claritos.",
};

/**
 * Página pública (spec 001). La cabecera sale en el prerenderizado; los horarios dependen de "ahora"
 * y de la dirección, así que se calculan en cada pedido detrás de Suspense (ADR-11).
 */
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-4 pb-12 pt-6 lg:px-8 lg:pt-10">
        <Suspense
          fallback={
            <div className="grid flex-1 place-items-center py-16">
              <BrandLoader label="Buscando horarios…" />
            </div>
          }
        >
          <Availability searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Availability({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const search = parseBookingSearch(await searchParams);
  await connection(); // "ahora" es el del pedido, nunca el del build
  const now = new Date();
  const q = queries();

  const services = await q.listServices();
  if (services.length === 0) return <NoServices whatsapp={await q.contactWhatsapp()} />;

  // Un servicio desconocido o desactivado en la dirección cae en el primero (caso límite 12).
  const service = services.find((s) => s.slug === search.servicio) ?? services[0]!;
  const availability = await q.getAvailability({
    serviceMinutes: service.durationMinutes,
    now,
    day: search.dia,
    weekOf: search.semana,
  });

  return (
    <>
      <SoonNotice whatsapp={availability.contactWhatsapp} />
      <BookingView services={services} service={service} availability={availability} today={localDateOf(now)} />
    </>
  );
}
