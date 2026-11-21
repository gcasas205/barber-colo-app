import { X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SUPABASE_ROOT_CA_2021 } from "./supabase-ca";

describe("certificado raíz de Supabase", () => {
  const cert = new X509Certificate(SUPABASE_ROOT_CA_2021);

  it("es la CA raíz de Supabase", () => {
    expect(cert.subject).toMatch(/CN=Supabase Root 2021 CA/);
    expect(cert.ca).toBe(true);
    expect(cert.checkIssued(cert)).toBe(true); // autofirmado: es una raíz
  });

  it("le queda más de un año de vigencia (si falla, hay que pedirle a Supabase el nuevo)", () => {
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    expect(new Date(cert.validTo).getTime() - Date.now()).toBeGreaterThan(oneYear);
  });
});
