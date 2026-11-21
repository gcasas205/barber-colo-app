"use client";

import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";

/** Si falla la base o algo inesperado: un mensaje humano, sin detalles técnicos (pueden tener datos internos). */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Plate className="flex flex-col items-start gap-3 p-5" role="alert">
        <h1 className="text-[28px] font-bold leading-tight">No pudimos cargar los horarios</h1>
        <p className="text-tinta-suave">Probá de nuevo en un rato. Si sigue igual, escribile a Colo por WhatsApp.</p>
        <Button variant="esmalte" onClick={() => reset()}>
          Probar de nuevo
        </Button>
      </Plate>
    </main>
  );
}
