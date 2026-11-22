import { Plate } from "@/ui/Plate";
import { ContactLink } from "./ContactLink";

/** RF-2b: sin servicios activos. */
export function NoServices({ whatsapp }: { whatsapp: string }) {
  return (
    <Plate className="flex flex-col items-start gap-3 p-5">
      <h1 className="text-[28px] font-bold leading-tight">Por ahora no hay turnos online</h1>
      <p className="text-tinta-suave">Escribile a Colo por WhatsApp y te dice cuándo puede atenderte.</p>
      <ContactLink number={whatsapp} />
    </Plate>
  );
}
