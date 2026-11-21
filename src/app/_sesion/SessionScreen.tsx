import type { ReactNode } from "react";
import { PublicHeader } from "../_reservar/PublicHeader";

/** Marco de las pantallas con sesión: misma chapa superior que la página pública, contenido angosto. */
export function SessionScreen({ banner, children }: { banner?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {banner}
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-7 px-4 pb-12 pt-6 lg:pt-10">{children}</main>
    </div>
  );
}
