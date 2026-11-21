import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Service } from "@/modules/pricing";
import type { Availability } from "@/modules/schedule";
import { instantAt, localDate } from "@/shared/kernel";
import { BookingView } from "./BookingView";
import { NoServices } from "./Notices";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode; scroll?: boolean }) => {
    delete rest.scroll; // prop de next/link, no es un atributo de <a>
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const corte: Service = {
  id: "1", slug: "corte", name: "Corte", description: "Corte de pelo",
  durationMinutes: 30, priceCents: 1_800_000, countsForBenefits: true, position: 1,
};
const claritos: Service = { ...corte, id: "3", slug: "claritos", name: "Claritos", description: "Reflejos", durationMinutes: 120, priceCents: 7_000_000, position: 3 };

const d = (s: string) => localDate(s);
const start = (date: string, minute: number, opensAt: number, closesAt: number) => ({
  start: instantAt(d(date), minute),
  label: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
  range: { opensAt, closesAt },
});

const base: Availability = {
  window: { first: d("2026-11-24"), last: d("2026-12-24") },
  contactWhatsapp: "+5491138163491",
  day: d("2026-11-26"),
  starts: [start("2026-11-26", 600, 600, 780), start("2026-11-26", 615, 600, 780), start("2026-11-26", 840, 840, 1200)],
  nextDayWithRoom: null,
  noRoomInWindow: false,
  week: ["23", "24", "25", "26", "27", "28", "29"].map((n, i) => ({
    date: d(`2026-11-${n}`),
    count: i === 6 ? 0 : 34,
    inWindow: i >= 1,
  })),
  previousWeek: null,
  nextWeek: d("2026-11-30"),
};

const render = (a: Partial<Availability> = {}, service = corte) =>
  renderToStaticMarkup(
    <BookingView services={[corte, claritos]} service={service} availability={{ ...base, ...a }} today={d("2026-11-24")} />,
  );

describe("BookingView", () => {
  it("muestra los servicios con descripción, duración y precio, y marca el elegido (RF-1, RF-3)", () => {
    const html = render();
    expect(html).toContain("Corte de pelo · 30 min");
    expect(html).toContain("$ 18.000");
    expect(html).toContain("Reflejos · 2 h");
    expect(html).toMatch(/href="\/\?servicio=corte&amp;dia=2026-11-26" aria-current="true"/);
  });

  it("agrupa los horarios por franja (RF-7)", () => {
    const html = render();
    expect(html).toContain("De 10:00 a 13:00");
    expect(html).toContain("De 14:00 a 20:00");
    expect(html.indexOf("10:15")).toBeLessThan(html.indexOf("De 14:00 a 20:00"));
  });

  it("muestra la semana con la cantidad de libres, sin lugar y días fuera de la ventana (RF-4, RF-5)", () => {
    const html = render();
    expect(html).toContain("34 libres");
    expect(html).toContain("Sin lugar");
    expect(html).toContain('aria-label="lunes 23 de noviembre, fuera de fecha"');
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('aria-label="Semana siguiente"');
    expect(html).not.toContain('aria-label="Semana anterior"');
  });

  it("un día sin lugar ofrece ir al próximo con lugar (RF-6)", () => {
    const html = render({ day: d("2026-11-29"), starts: [], nextDayWithRoom: d("2026-11-30") });
    expect(html).toContain("Ese día no hay lugar para corte.");
    expect(html).toContain('href="/?servicio=corte&amp;dia=2026-11-30"');
    expect(html).toContain("Ver el lunes 30 de noviembre");
  });

  it("sin lugar en toda la ventana, lo dice y ofrece WhatsApp (RF-6b)", () => {
    const html = render({ noRoomInWindow: true, starts: [] }, claritos);
    expect(html).toContain("No hay lugar para claritos en los próximos 30 días");
    expect(html).toContain("https://wa.me/5491138163491?text=");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("De 10:00 a 13:00");
  });

  it("dice Hoy cuando el día elegido es hoy", () => {
    expect(render({ day: d("2026-11-24") })).toContain("Hoy, martes 24 de noviembre");
  });

  it("sin servicios activos muestra el aviso con WhatsApp (RF-2b)", () => {
    const html = renderToStaticMarkup(<NoServices whatsapp="+5491138163491" />);
    expect(html).toContain("Por ahora no hay turnos online");
    expect(html).toContain("11 3816-3491");
  });
});
