import { readFileSync } from "node:fs";
import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, inRollback, sqlState, TEST_DATABASE_URL } from "./db";

// SQLSTATE: 23514 check, 23505 único, 23P01 exclusión, 22000 rango mal formado, 42501 sin permiso.
let db: Client;
beforeAll(async () => {
  db = await connect();
});
afterAll(async () => {
  await db.end();
});

describe("configuración inicial (RNF-5)", () => {
  it("tiene los parámetros de la agenda", async () => {
    const { rows } = await db.query("select * from app.schedule_settings");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      step_minutes: 15,
      min_notice_minutes: 30,
      max_advance_days: 30,
      contact_whatsapp: "+5491138163491",
    });
  });

  it("tiene las franjas provisorias de lunes a sábado y nada el domingo", async () => {
    const { rows } = await db.query(
      "select weekday, opens_at::text as opens, closes_at::text as closes from app.weekly_ranges order by weekday, opens_at",
    );
    expect(rows).toHaveLength(12);
    expect(rows.slice(0, 2)).toEqual([
      { weekday: 1, opens: "10:00:00", closes: "13:00:00" },
      { weekday: 1, opens: "14:00:00", closes: "20:00:00" },
    ]);
    expect(rows.some((r) => r.weekday === 7)).toBe(false);
  });

  it("tiene los tres servicios en orden", async () => {
    const { rows } = await db.query(
      "select name, description, duration_minutes, price_cents, counts_for_benefits from app.services where deactivated_at is null order by position",
    );
    expect(rows).toEqual([
      {
        name: "Corte",
        description: "Corte de pelo",
        duration_minutes: 30,
        price_cents: 1800000,
        counts_for_benefits: true,
      },
      {
        name: "Completo",
        description: "Corte, barba y cejas",
        duration_minutes: 30,
        price_cents: 2000000,
        counts_for_benefits: true,
      },
      {
        name: "Claritos",
        description: "Reflejos",
        duration_minutes: 120,
        price_cents: 7000000,
        counts_for_benefits: false,
      },
    ]);
  });
});

describe("restricciones de la agenda (RF-12, RF-14)", () => {
  const range =
    "insert into app.weekly_ranges (weekday, opens_at, closes_at) values ($1, $2, $3)";

  it("rechaza franjas superpuestas en el mismo día y acepta las que se tocan", () =>
    inRollback(db, async () => {
      expect(await sqlState(db, range, [7, "10:00", "12:00"])).toBeNull();
      expect(await sqlState(db, range, [7, "11:00", "13:00"])).toBe("23P01");
      expect(await sqlState(db, range, [7, "12:00", "13:00"])).toBeNull();
      expect(await sqlState(db, range, [1, "12:00", "14:00"])).toBe("23P01"); // pisa la franja inicial 10–13
    }));

  it("rechaza franjas invertidas o de duración cero, y días inexistentes", () =>
    inRollback(db, async () => {
      expect(await sqlState(db, range, [7, "13:00", "10:00"])).toBe("23514");
      expect(await sqlState(db, range, [7, "10:00", "10:00"])).toBe("23514");
      expect(await sqlState(db, range, [8, "10:00", "11:00"])).toBe("23514");
    }));

  it("acepta una franja que cierra a las 24:00", () =>
    inRollback(db, async () => {
      expect(await sqlState(db, range, [7, "20:00", "24:00"])).toBeNull();
    }));

  it("rechaza pasos que no dividen la hora y una segunda fila de configuración", () =>
    inRollback(db, async () => {
      expect(
        await sqlState(db, "update app.schedule_settings set step_minutes = 7"),
      ).toBe("23514");
      expect(
        await sqlState(
          db,
          "update app.schedule_settings set step_minutes = 20",
        ),
      ).toBeNull();
      expect(
        await sqlState(
          db,
          "insert into app.schedule_settings (id, step_minutes, min_notice_minutes, max_advance_days, approval_min_notice_minutes, contact_whatsapp) values (2, 15, 30, 30, 120, '+5491100000000')",
        ),
      ).toBe("23514");
    }));

  it("rechaza bloqueos vacíos, invertidos o sin fin", () =>
    inRollback(db, async () => {
      const block =
        "insert into app.schedule_blocks (period) values ($1::tstzrange)";
      expect(
        await sqlState(db, block, [
          "[2026-12-01 10:00-03, 2026-12-01 11:00-03)",
        ]),
      ).toBeNull();
      expect(
        await sqlState(db, block, [
          "[2026-12-01 10:00-03, 2026-12-01 10:00-03)",
        ]),
      ).toBe("23514");
      expect(
        await sqlState(db, block, [
          "[2026-12-01 11:00-03, 2026-12-01 10:00-03)",
        ]),
      ).toBe("22000");
      expect(await sqlState(db, block, ["[2026-12-01 10:00-03,)"])).toBe(
        "23514",
      );
    }));
});

describe("restricciones de los servicios (RF-13)", () => {
  const insert =
    "insert into app.services (name, duration_minutes, price_cents, counts_for_benefits, position) values ($1, $2, $3, false, 9)";

  it("rechaza precio cero o negativo y duración no positiva", () =>
    inRollback(db, async () => {
      expect(await sqlState(db, insert, ["Barba", 15, 0])).toBe("23514");
      expect(await sqlState(db, insert, ["Barba", 15, -100])).toBe("23514");
      expect(await sqlState(db, insert, ["Barba", 0, 1000000])).toBe("23514");
      expect(await sqlState(db, insert, ["Barba", 15, 1000050])).toBe("23514"); // con centavos
      expect(await sqlState(db, insert, ["Barba", 15, 1000000])).toBeNull();
    }));

  it("rechaza un nombre repetido entre los activos, sin importar mayúsculas ni espacios", () =>
    inRollback(db, async () => {
      expect(await sqlState(db, insert, ["  corte ", 30, 1000000])).toBe(
        "23505",
      );
    }));

  it("permite reusar el nombre de un servicio desactivado", () =>
    inRollback(db, async () => {
      await db.query(
        "update app.services set deactivated_at = now() where name = 'Claritos'",
      );
      expect(await sqlState(db, insert, ["Claritos", 90, 6000000])).toBeNull();
    }));
});

describe("seguridad (S-3, S-4)", () => {
  it("tiene RLS activado en todas las tablas de app", async () => {
    const { rows } = await db.query(
      "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'app' and c.relkind = 'r' and not c.relrowsecurity",
    );
    expect(rows).toEqual([]);
  });

  it("anon y authenticated no pueden usar los esquemas app ni stats", async () => {
    const { rows } = await db.query(`
      select r.role, s.schema, has_schema_privilege(r.role, s.schema, 'usage') as usage
      from (values ('anon'), ('authenticated')) r(role), (values ('app'), ('stats')) s(schema)`);
    expect(rows.filter((r) => r.usage)).toEqual([]);
  });

  it("anon y authenticated no tienen permisos sobre ninguna tabla de app", async () => {
    const { rows } = await db.query(`
      select grantee, table_name, privilege_type from information_schema.role_table_grants
      where table_schema in ('app', 'stats') and grantee in ('anon', 'authenticated', 'PUBLIC')`);
    expect(rows).toEqual([]);
  });

  it("la Data API no publica app ni stats", () => {
    const config = readFileSync(
      new URL("../../supabase/config.toml", import.meta.url),
      "utf8",
    );
    const schemas = /^schemas\s*=\s*\[(.*)\]/m.exec(config)?.[1] ?? "";
    expect(schemas).not.toMatch(/"app"|"stats"/);
  });

  describe("como app_server", () => {
    let asApp: Client;
    beforeAll(async () => {
      // Contraseña solo para la base local de tests. En producción la pone una persona (T10).
      await db.query("alter role app_server password 'local-test-only'");
      asApp = await connect(
        TEST_DATABASE_URL.replace(
          "postgres:postgres@",
          "app_server:local-test-only@",
        ),
      );
    });
    afterAll(async () => {
      await asApp.end();
    });

    it("puede leer la configuración y los servicios", async () => {
      const { rows } = await asApp.query(
        "select count(*)::int as n from app.services",
      );
      expect(rows[0].n).toBe(3);
      await expect(
        asApp.query("select * from app.weekly_ranges"),
      ).resolves.toBeDefined();
      await expect(
        asApp.query("select * from app.schedule_blocks"),
      ).resolves.toBeDefined();
    });

    it("no puede escribir en la spec 001", () =>
      inRollback(asApp, async () => {
        expect(
          await sqlState(asApp, "update app.services set price_cents = 1"),
        ).toBe("42501");
        expect(
          await sqlState(
            asApp,
            "insert into app.schedule_blocks (period) values ('[2026-12-01 10:00-03, 2026-12-01 11:00-03)')",
          ),
        ).toBe("42501");
        expect(await sqlState(asApp, "delete from app.weekly_ranges")).toBe(
          "42501",
        );
      }));

    it("no puede tocar los esquemas de Supabase", () =>
      inRollback(asApp, async () => {
        expect(await sqlState(asApp, "select * from auth.users")).toBe("42501");
      }));
  });
});
