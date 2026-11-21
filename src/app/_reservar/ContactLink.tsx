import { MessageCircle } from "lucide-react";
import { cx } from "@/ui/cx";
import { formatWhatsapp, whatsappHref } from "./whatsapp";

/** Enlace a WhatsApp con forma de botón secundario. Abre en otra pestaña sin pasarle acceso a esta. */
export function ContactLink({ number, className }: { number: string; className?: string }) {
  return (
    <a
      href={whatsappHref(number)}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "inline-flex min-h-[52px] flex-wrap items-center justify-center gap-x-2 rounded-[var(--radius-control)] bg-chapa px-5 py-2 text-center text-[17px] font-bold text-tinta shadow-[inset_0_0_0_2px_var(--linea)] hover:shadow-[inset_0_0_0_2px_var(--esmalte-200)]",
        className,
      )}
    >
      <MessageCircle aria-hidden size={22} strokeWidth={2.5} />
      <span>Escribile a Colo</span>
      <span className="whitespace-nowrap">· {formatWhatsapp(number)}</span>
    </a>
  );
}
