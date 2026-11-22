import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppFrame } from "./AppFrame";
import { SectionNav } from "./SectionNav";

vi.mock("../_tema/ThemeControl", () => ({ ThemeControl: () => null }));

const current = (html: string) => [...html.matchAll(/aria-current="page"[^>]*>(?:<span[^>]*>)?(?:<svg[\s\S]*?<\/svg>)(?:<\/span>)?([^<]+)/g)].map((m) => m[1]);

describe("secciones (spec 004c, RF-1 a RF-4)", () => {
  it("Colo: Agenda, Clientes y Ajustes; marcada la de la pantalla", () => {
    const html = renderToStaticMarkup(<SectionNav area="colo" current="/colo/clientes" variant="bar" />);
    expect(html).toContain('aria-label="Secciones"');
    for (const s of ["Agenda", "Clientes", "Ajustes"]) expect(html).toContain(s);
    expect(current(html)).toEqual(["Clientes"]);
  });

  it("cliente: Inicio, Reservar y Mi perfil, con sus direcciones de siempre", () => {
    const html = renderToStaticMarkup(<SectionNav area="cliente" current="/turnos" variant="rail" />);
    expect(html).toMatch(/href="\/turnos"[\s\S]*Inicio[\s\S]*href="\/reservar"[\s\S]*Reservar[\s\S]*href="\/perfil"[\s\S]*Mi perfil/);
    expect(current(html)).toEqual(["Inicio"]);
  });

  it("el marco tiene barra y riel, y la chapa dice la sección sin ser otro título", () => {
    const html = renderToStaticMarkup(
      <AppFrame area="colo" current="/colo/ajustes">
        <h1>Ajustes</h1>
      </AppFrame>,
    );
    expect(html.match(/aria-label="Secciones"/g)).toHaveLength(2);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/letras-chapa[^>]*>Ajustes<\/p>/);
  });
});
