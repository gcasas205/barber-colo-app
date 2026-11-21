import Link from "next/link";
import { BrandLoader } from "@/ui/brand/BrandLoader";
import { Plate } from "@/ui/Plate";

const SCREENS = [
  { href: "/prototipo/cliente", title: "Inicio del cliente", text: "Próximo turno, personas a cargo y beneficios." },
  { href: "/prototipo/reservar", title: "Reservar turno", text: "Para quién, día, horario y confirmación." },
  { href: "/prototipo/barbero", title: "Hoy del barbero", text: "Quién está ahora, qué decidir y la fila del día." },
];

export default function PrototypeIndex() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-5 py-10">
      <h1 className="letras-chapa text-[22px] text-tinta">Prototipo de diseño</h1>
      <ul className="flex flex-col gap-3">
        {SCREENS.map((s) => (
          <li key={s.href}>
            <Plate as={Link} href={s.href} className="block px-5 py-4 hover:shadow-[inset_0_0_0_2px_var(--esmalte-200)]">
              <span className="block text-[19px] font-bold">{s.title}</span>
              <span className="block text-tinta-suave">{s.text}</span>
            </Plate>
          </li>
        ))}
      </ul>
      <section aria-labelledby="carga" className="flex flex-col items-center gap-3 py-6">
        <h2 id="carga" className="self-start text-[19px] font-bold">Pantalla de carga</h2>
        <BrandLoader label="Cargando tus turnos…" />
      </section>
      <p className="text-[14px] text-tinta-suave">Datos de ejemplo: nombres, horarios y precios son ficticios.</p>
    </main>
  );
}
