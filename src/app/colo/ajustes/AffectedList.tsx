import { CalendarClock } from "lucide-react";
import Link from "next/link";
import type { AffectedItem } from "./actions";

/** Spec 004, RF-27: turnos que quedarían afuera, con el enlace a la agenda de ese día. */
export function AffectedList({ items }: { items?: AffectedItem[] }) {
  if (!items?.length) return null;
  return (
    <ul className="flex flex-col gap-2" aria-label="Turnos que quedarían afuera">
      {items.map((a) => (
        <li key={a.id}>
          <Link
            href={`/colo?dia=${a.day}`}
            className="inline-flex min-h-[44px] items-center gap-2 font-bold underline decoration-2 underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste"
          >
            <CalendarClock aria-hidden size={18} strokeWidth={2.5} /> {a.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
