import { CalendarDays, House } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppHeader } from "./AppHeader";
import { AppShell } from "./AppShell";
import { BottomNav, type NavItem } from "./BottomNav";
import { Badge } from "./brand/Badge";
import { BrandLoader } from "./brand/BrandLoader";
import { Button } from "./Button";
import { cx } from "./cx";
import { Field, MoneyInput, Select, Switch, TextInput } from "./Field";
import { Plate } from "./Plate";
import { PoleBand } from "./PoleBand";
import { StatusMark, type AppointmentStatus } from "./StatusMark";
import { Tally } from "./Tally";

const html = renderToStaticMarkup;
const nav: NavItem[] = [
  { href: "/", label: "Inicio", icon: House, current: true },
  { href: "/turnos", label: "Turnos", icon: CalendarDays },
];
/** Los enlaces de un HTML: [href, aria-current, texto]. */
const links = (markup: string) =>
  [...markup.matchAll(/<a ([^>]*)>(.*?)<\/a>/g)].map(([, attrs, inner]) => [
    attrs!.match(/href="([^"]*)"/)?.[1],
    /aria-current="page"/.test(attrs!) ? "page" : null,
    inner!.replace(/<[^>]+>/g, ""),
  ]);
const classes = (markup: string, tag: string) => [...markup.matchAll(new RegExp(`<${tag} class="([^"]*)"`, "g"))].map(([, c]) => c!.split(" "));

describe("Button", () => {
  it("es un botón común (no envía formularios) salvo que se pida otro tipo", () => {
    expect(html(<Button>Cancelar</Button>)).toMatch(/^<button type="button"/);
    expect(html(<Button type="submit">Guardar</Button>)).toMatch(/^<button type="submit"/);
  });

  it("solo la variante principal es roja (DESIGN.md: un solo botón rojo por pantalla)", () => {
    const red = (b: string) => / bg-poste /.test(` ${b.match(/class="([^"]*)"/)![1]} `);
    expect(red(html(<Button variant="principal">a</Button>))).toBe(true);
    for (const variant of ["esmalte", "secundario", "texto"] as const) expect(red(html(<Button variant={variant}>a</Button>))).toBe(false);
    expect(html(<Button>a</Button>)).toContain("bg-chapa"); // secundario por defecto
    expect(html(<Button variant="esmalte">a</Button>)).toContain("bg-esmalte ");
    expect(html(<Button variant="texto">a</Button>)).toContain("underline");
    expect(html(<Button className="w-full">a</Button>)).toContain("w-full");
  });
});

describe("AppHeader", () => {
  it("sin `back` muestra la insignia; con `back`, un enlace Volver en su lugar", () => {
    expect(html(<AppHeader title="Hoy" />)).toContain('alt="El Colo, Barbería y Peluquería"');
    const back = html(<AppHeader title="Turno" back="/agenda" />);
    expect(links(back)[0]).toEqual(["/agenda", null, "Volver"]);
    expect(back).not.toContain("<img");
  });

  it("dice cuántos avisos hay sin leer, y sin avisos no muestra contador", () => {
    expect(html(<AppHeader title="Hoy" unread={3} />)).toMatch(/aria-label="Avisos, 3 sin leer"[^>]*>.*>3<\/span><\/a>/);
    expect(html(<AppHeader title="Hoy" unread={1} />)).toMatch(/aria-label="Avisos, 1 sin leer"[^>]*>.*>1<\/span><\/a>/);
    const none = html(<AppHeader title="Hoy" />);
    expect(none).toContain('aria-label="Avisos"');
    expect(none).toMatch(/<\/svg><\/a>/); // solo la campana
  });

  it("en web puede mostrar otro título; si no, el título se ve siempre", () => {
    const both = html(<AppHeader title="Hoy" webTitle="Agenda de hoy" />);
    expect(both).toContain('<span class="lg:hidden">Hoy</span>');
    expect(both).toContain('<span class="hidden lg:inline">Agenda de hoy</span>');
    expect(html(<AppHeader title="Hoy">extra</AppHeader>)).toMatch(/<span>Hoy<\/span>.*extra<\/header>/);
  });
});

describe("BottomNav y AppShell", () => {
  it("enlazan cada sección y marcan solo la actual, en el riel (web) y en la barra (celular)", () => {
    expect(links(html(<BottomNav items={nav} />))).toEqual([
      ["/", "page", "Inicio"],
      ["/turnos", null, "Turnos"],
    ]);
    const shell = html(<AppShell nav={nav}>contenido</AppShell>);
    expect(shell).toContain("contenido");
    expect(links(shell).filter(([href]) => href !== "/prototipo")).toEqual([
      ["/", "page", "Inicio"],
      ["/turnos", null, "Turnos"],
      ["/", "page", "Inicio"],
      ["/turnos", null, "Turnos"],
    ]);
  });

  it("solo la sección actual lleva la pastilla clara detrás del ícono", () => {
    const pills = classes(html(<BottomNav items={nav} />), "span").filter((c) => c.includes("h-8"));
    expect(pills.map((c) => c.some((x) => x.startsWith("bg-[")))).toEqual([true, false]);
  });
});

describe("Field y sus controles", () => {
  it("la etiqueta envuelve al control y la ayuda aparece solo si se da", () => {
    const withHint = html(<Field label="Nombre" hint="Como figura en el turno"><TextInput defaultValue="Juan" /></Field>);
    expect(withHint).toMatch(/^<label[^>]*><span[^>]*>Nombre<\/span><input[^>]*value="Juan"[^>]*\/><span[^>]*>Como figura en el turno<\/span><\/label>$/);
    expect(html(<Field label="Nombre"><TextInput /></Field>)).not.toContain("Como figura");
  });

  it("el monto pide teclado numérico y muestra el signo $; el desplegable ofrece sus opciones", () => {
    const money = html(<MoneyInput defaultValue="18000" />);
    expect(money).toContain('inputMode="numeric"');
    expect(money).toContain(">$</span>");
    expect(html(<Select defaultValue="b"><option value="a">Corte</option><option value="b">Completo</option></Select>)).toContain('<option value="b" selected="">Completo</option>');
  });

  it("el interruptor es un checkbox con rol switch que refleja su estado", () => {
    const off = html(<Switch label="Avisos" checked={false} onChange={() => {}} />);
    expect(off).toMatch(/<input type="checkbox" role="switch" class="peer sr-only"\/>/);
    expect(off).toContain("translate-x-1");
    const on = html(<Switch label="Avisos" hint="Un día antes" checked onChange={() => {}} />);
    expect(on).toMatch(/role="switch" class="peer sr-only" checked=""/);
    expect(on).toContain("translate-x-7");
    expect(on).toContain("Un día antes");
  });
});

describe("marcas", () => {
  it("Tally se lee como texto y marca las casillas hechas", () => {
    const tally = html(<Tally done={3} total={4} />);
    expect(tally).toContain('role="img" aria-label="3 de 4"');
    expect(classes(tally, "span").map((c) => c.includes("bg-esmalte"))).toEqual([true, true, true, false]);
  });

  it.each([
    ["pending_approval", "Por aprobar"],
    ["booked", "Reservado"],
    ["confirmed", "Confirmado"],
    ["unconfirmed", "Sin confirmar"],
    ["attended", "Asistió"],
    ["no_show", "Faltó"],
    ["cancelled", "Cancelado"],
    ["cancelled_late", "Canceló tarde"],
  ] as [AppointmentStatus, string][])("el estado %s se dice con palabra: %s", (status, label) => {
    expect(html(<StatusMark status={status} />)).toMatch(new RegExp(`</svg>${label}</span>$`));
  });

  it("Plate es una sección blanca por defecto y puede ser de esmalte y de otra etiqueta", () => {
    expect(html(<Plate>a</Plate>)).toMatch(/^<section class="[^"]*bg-chapa/);
    expect(html(<Plate as="article" tone="esmalte">b</Plate>)).toMatch(/^<article class="[^"]*bg-esmalte/);
  });

  it("la insignia tiene texto alternativo, tamaño y versión oscura", () => {
    expect(html(<Badge />)).toContain('<img src="/brand/logo-el-colo.svg" alt="El Colo, Barbería y Peluquería" width="40" height="40"/>');
    expect(html(<Badge dark size={52} />)).toContain('src="/brand/logo-el-colo-oscuro.svg"');
  });

  it("la pantalla de carga se anuncia con su texto; el poste es decorativo", () => {
    expect(html(<BrandLoader />)).toMatch(/role="status".*>Cargando…<\/p>/);
    expect(html(<BrandLoader label="Buscando horarios…" />)).toContain(">Buscando horarios…</p>");
    expect(html(<PoleBand className="mt-2" />)).toBe('<div aria-hidden="true" class="poste h-2 w-full mt-2"></div>');
  });

  it("cx une solo las clases presentes", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
  });
});
