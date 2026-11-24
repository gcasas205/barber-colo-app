import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { arrowTarget, isTabStop, Segmented } from "./Segmented";

describe("Segmented (spec 004c, RF-9)", () => {
  it("grupo de radios: la elegida marcada, la deshabilitada con su motivo", () => {
    const html = renderToStaticMarkup(
      <Segmented
        label="¿Para quién es?"
        value="a"
        onChange={() => {}}
        options={[
          { value: "a", label: "Para mí" },
          { value: "b", label: "Para Tomi", disabled: true, hint: "Ya tiene turno" },
        ]}
      />,
    );
    expect(html).toContain('role="radiogroup" aria-label="¿Para quién es?"');
    expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>.*Para mí/);
    expect(html).toMatch(/aria-checked="false" disabled=""[^>]*>.*Para Tomi.*Ya tiene turno/);
  });
});

describe("Segmented: teclado (patrón de grupo de radios)", () => {
  it("las flechas avanzan o retroceden, dan la vuelta y saltean las deshabilitadas", () => {
    const enabled = [0, 2, 3]; // la 1 está deshabilitada
    expect(arrowTarget("ArrowRight", 0, enabled)).toBe(2);
    expect(arrowTarget("ArrowDown", 2, enabled)).toBe(3);
    expect(arrowTarget("ArrowRight", 3, enabled)).toBe(0);
    expect(arrowTarget("ArrowLeft", 0, enabled)).toBe(3);
    expect(arrowTarget("ArrowUp", 2, enabled)).toBe(0);
  });

  it("otra tecla, o ninguna opción habilitada, no mueve", () => {
    expect(arrowTarget("Enter", 0, [0, 1])).toBeNull();
    expect(arrowTarget("ArrowRight", 0, [])).toBeNull();
  });

  it("con Tab se llega a la elegida; sin elegida, a la primera habilitada", () => {
    expect(isTabStop(2, true, "c", [0, 2])).toBe(true);
    expect(isTabStop(0, false, "c", [0, 2])).toBe(false);
    expect(isTabStop(0, false, null, [0, 2])).toBe(true);
    expect(isTabStop(2, false, null, [0, 2])).toBe(false);
  });

  it("sin elegida, la primera habilitada es la que recibe el Tab", () => {
    const html = renderToStaticMarkup(
      <Segmented
        label="Servicio"
        value={null}
        onChange={() => {}}
        options={[
          { value: "a", label: "Corte", disabled: true },
          { value: "b", label: "Completo" },
        ]}
      />,
    );
    expect(html).toMatch(/tabindex="-1"[^>]*>.*Corte/);
    expect(html).toMatch(/tabindex="0"[^>]*><span[^>]*>Completo/);
  });
});
