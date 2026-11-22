import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InicioClient, type Person } from "./InicioClient";
import type { TurnoView } from "./turno-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("./actions", () => ({ cancelAction: vi.fn(), dismissNoticeAction: vi.fn() }));

const NOW = new Date("2026-11-24T12:00:00-03:00").getTime();
const at = (hhmm: string) => new Date(`2026-11-26T${hhmm}:00-03:00`).getTime();
const turno = (customerId: string, customerName: string, isSelf: boolean, start: string): TurnoView => ({
  id: `t-${customerId}`, customerId, customerName, isSelf, serviceId: "1", serviceName: "Corte",
  start: at(start), end: at(start) + 30 * 60_000, status: "reserved", priceCents: 1_800_000, customerReschedules: 0, bookedAt: NOW - 3_600_000,
});
const vos: Person = { customerId: "c1", name: "Vos", isSelf: true };
const render = (p: Partial<Parameters<typeof InicioClient>[0]>) =>
  renderToStaticMarkup(<InicioClient name="Martín" turnos={[]} people={[vos]} notice={null} done={null} serverNow={NOW} {...p} />);

describe("Inicio del cliente (spec 004c, RF-5 a RF-8)", () => {
  it("caso 1: sin turnos ni personas a cargo, saluda, lo dice y ofrece reservar", () => {
    const html = render({});
    expect(html).toContain("Hola, Martín");
    expect(html).toContain("No tenés turnos reservados.");
    expect(html).toMatch(/href="\/reservar"[^>]*>.*Reservar turno/);
  });

  it("caso 2: un invitado sin nombre: 'Hola'", () => {
    expect(render({ name: null })).toMatch(/<h1[^>]*>Hola<\/h1>/);
  });

  it("caso 3: titular con turno y dos hijos, uno con turno: dos chapas, uno sin turno y Reservar", () => {
    const html = render({
      people: [vos, { customerId: "c3", name: "Tomi", isSelf: false }, { customerId: "c4", name: "Juli", isSelf: false }],
      turnos: [turno("c1", "Martín", true, "16:00"), turno("c3", "Tomi", false, "16:30")],
    });
    expect(html).toContain('aria-label="Tu próximo turno"');
    expect(html).toContain('aria-label="Turno de Tomi"');
    expect(html).toContain("Jue 26 · 16:00");
    expect(html).toMatch(/aria-label="Juli"[\s\S]*Sin turno reservado/);
    expect(html).toContain("Reservar turno");
    expect(html).toContain('href="/reservar?cambiar=t-c1"');
  });

  it("caso 4: todos con turno, no ofrece reservar", () => {
    const html = render({ turnos: [turno("c1", "Martín", true, "16:00")] });
    expect(html).not.toContain("Reservar turno");
  });

  it("RF-12: al volver de Reservar, el mensaje sale de sus propios datos", () => {
    const html = render({
      people: [vos, { customerId: "c3", name: "Tomi", isSelf: false }],
      turnos: [turno("c3", "Tomi", false, "16:30")],
      done: { kind: "reserva", turnoId: "t-c3" },
    });
    expect(html).toContain("¡Listo! Reservaste el turno de Tomi.");
  });
});
