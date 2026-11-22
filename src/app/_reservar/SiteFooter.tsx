import { AtSign, MessageCircle } from "lucide-react";
import { formatWhatsapp, TO_COLO, whatsappHref } from "./whatsapp";

/** Instagram de El Colo (de donde salió el logo y el teléfono). */
export const INSTAGRAM = "elcolo.barbershop";

const LINK =
  "flex min-h-[52px] items-center gap-3 rounded-[var(--radius-control)] px-3 font-bold text-sobre-esmalte hover:bg-[rgb(243_245_244/0.10)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste";

/** Pie con las redes de El Colo (RF-18). */
export function SiteFooter({ whatsapp }: { whatsapp: string }) {
  return (
    <footer className="bg-esmalte text-sobre-esmalte-suave">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 lg:px-8">
        <p className="letras-chapa text-[17px] text-sobre-esmalte">El Colo</p>
        <ul className="flex flex-col gap-1 sm:flex-row sm:gap-4">
          <li>
            <a href={whatsappHref(whatsapp, TO_COLO)} target="_blank" rel="noopener noreferrer" className={LINK}>
              <MessageCircle aria-hidden size={22} strokeWidth={2.25} />
              <span>
                WhatsApp <span className="font-normal text-sobre-esmalte-suave">· {formatWhatsapp(whatsapp)}</span>
              </span>
            </a>
          </li>
          <li>
            <a href={`https://www.instagram.com/${INSTAGRAM}/`} target="_blank" rel="noopener noreferrer" className={LINK}>
              <AtSign aria-hidden size={22} strokeWidth={2.25} />
              <span>
                Instagram <span className="font-normal text-sobre-esmalte-suave">· @{INSTAGRAM}</span>
              </span>
            </a>
          </li>
        </ul>
        <p className="text-[15px]">Barbería y Peluquería</p>
      </div>
    </footer>
  );
}
