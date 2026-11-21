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
    router.prefetch("/perfil");
    router.prefetch("/colo");
    // El código de los componentes cliente de esas pantallas no viene con el prefetch de la ruta.
    void import("../perfil/ProfileForm");
    void import("../colo/CustomerList");
  }, [router]);
  return null;
}
