"use client";

import { useEffect } from "react";

const dirty = new Set<string>();
const MESSAGE = "Tenés cambios sin guardar en Ajustes. ¿Salir igual?";

function onBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
}

/** Un enlace a otra pantalla con cambios sin guardar pide confirmación (RF-26). */
function onClick(e: MouseEvent) {
  const link = (e.target as Element | null)?.closest?.("a[href]");
  if (!link || (link as HTMLAnchorElement).target === "_blank") return;
  const href = (link as HTMLAnchorElement).getAttribute("href") ?? "";
  if (href.startsWith("#")) return; // saltar a otra sección de la misma pantalla
  if (!window.confirm(MESSAGE)) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function sync() {
  if (dirty.size > 0) {
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
  } else {
    window.removeEventListener("beforeunload", onBeforeUnload);
    document.removeEventListener("click", onClick, true);
  }
}

/** RF-26: mientras una sección tiene cambios sin guardar, salir de la pantalla pide confirmación. */
export function useUnsavedGuard(section: string, isDirty: boolean) {
  useEffect(() => {
    if (isDirty) dirty.add(section);
    else dirty.delete(section);
    sync();
    return () => {
      dirty.delete(section);
      sync();
    };
  }, [section, isDirty]);
}
