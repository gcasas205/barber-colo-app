import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter (RF-18)", () => {
  it("enlaza a WhatsApp y a Instagram de El Colo, en otra pestaña y sin pasarles acceso", () => {
    const html = renderToStaticMarkup(<SiteFooter whatsapp="+5491138163491" />);
    expect(html).toContain('href="https://wa.me/5491138163491?text=');
    expect(html).toContain('href="https://www.instagram.com/elcolo.barbershop/"');
    expect(html).toContain("@elcolo.barbershop");
    expect(html).toContain("11 3816-3491");
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
  });
});
