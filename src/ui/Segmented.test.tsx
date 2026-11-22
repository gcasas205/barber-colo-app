import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Segmented } from "./Segmented";

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
