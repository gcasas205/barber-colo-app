import { Plate } from "@/ui/Plate";
import { ContactLink } from "./ContactLink";

/** Mientras no se pueda reservar online (spec 003), se aclara y se ofrece WhatsApp. */
export function SoonNotice({ whatsapp }: { whatsapp: string }) {
  return (
    <Plate tone="esmalte" className="flex flex-col items-start gap-3 p-5">
      <h1 className="text-[28px] font-bold leading-tight">Horarios libres</h1>
      <p className="text-sobre-esmalte-suave">
        Muy pronto vas a poder reservar desde acá. Mientras tanto, mirá qué hay libre y escribile a Colo.
      </p>
      <ContactLink number={whatsapp} />
    </Plate>
  );
}

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
