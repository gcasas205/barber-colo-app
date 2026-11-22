import { LogOut } from "lucide-react";
import { Button } from "@/ui/Button";
import { signOut, signOutEverywhere } from "../ingresar/actions";

/** Salir, al pie del panel (RF-5 y RF-5b de la 002). Las secciones están en el marco (spec 004c). */
export function ColoSignOut() {
  return (
    <div className="flex flex-col items-start gap-1 border-t-2 border-linea pt-4">
      <form action={signOut}>
        <Button type="submit" variant="texto">
          <LogOut aria-hidden size={20} strokeWidth={2.5} /> Salir
        </Button>
      </form>
      <form action={signOutEverywhere}>
        <Button type="submit" variant="texto">
          <LogOut aria-hidden size={20} strokeWidth={2.5} /> Salir de todos los dispositivos
        </Button>
      </form>
    </div>
  );
}
