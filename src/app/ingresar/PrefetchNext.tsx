"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * RNF-6: mientras la persona completa el formulario, se precarga el código de las pantallas a las que
 * va a ir después de ingresar. Así, al enviar, no hay que esperar esa descarga (con 4G, ~300 ms).
 */
export function PrefetchNext() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/turnos");
    router.prefetch("/colo");
    // El código de los componentes cliente de esas pantallas no viene con el prefetch de la ruta.
    void import("../turnos/InicioClient");
    void import("../colo/AgendaDay");
  }, [router]);
  return null;
}
