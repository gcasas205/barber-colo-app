import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { Actor } from "@/modules/identity";
import { Plate } from "@/ui/Plate";
import { SessionScreen } from "./SessionScreen";

/** Pantalla de Colo abierta sin rol de barbero: ningún dato (spec 002 RF-8, spec 003 RF-2). */
export function NoAccess({ actor }: { actor: Actor }) {
  return (
    <SessionScreen>
      <Plate className="flex flex-col items-start gap-3 p-5" role="alert">
        <h1 className="inline-flex items-center gap-2 text-[24px] font-bold leading-tight">
          <ShieldAlert aria-hidden size={26} strokeWidth={2.5} /> No tenés acceso a esta pantalla
        </h1>
        <Link href={actor.kind === "none" ? "/ingresar" : "/"} className="font-bold underline decoration-2 underline-offset-4">
          {actor.kind === "none" ? "Ingresar" : "Volver a los horarios"}
        </Link>
      </Plate>
    </SessionScreen>
  );
}
