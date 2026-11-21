import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CustomerListItem } from "@/modules/customers";
import { CustomerCard } from "./CustomerCard";

const base: CustomerListItem = {
  id: "1", role: "guest", fullName: "Lucas", phone: "+5491138163491" as CustomerListItem["phone"],
  nickname: null, isDemo: false, createdAt: new Date(),
};

describe("CustomerCard (RF-19, RF-20)", () => {
  it("muestra nombre, celular y tipo con ícono y palabra", () => {
    const html = renderToStaticMarkup(<CustomerCard customer={base} />);
    expect(html).toContain("Lucas");
    expect(html).toContain("11 3816-3491");
    expect(html).toContain("Invitado");
  });

  it("con sobrenombre, lo muestra primero y el nombre al lado", () => {
    const html = renderToStaticMarkup(<CustomerCard customer={{ ...base, role: "holder", nickname: "el de la moto" }} />);
    expect(html.indexOf("el de la moto")).toBeLessThan(html.indexOf("Lucas"));
    expect(html).toContain("Cuenta");
  });

  it("marca los datos de prueba y los perfiles sin celular", () => {
    const html = renderToStaticMarkup(<CustomerCard customer={{ ...base, role: "holder", phone: null, isDemo: true }} />);
    expect(html).toContain("Prueba");
    expect(html).toContain("Sin celular todavía");
  });
});
