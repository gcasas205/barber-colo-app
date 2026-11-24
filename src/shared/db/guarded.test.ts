import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from "kysely";
import { describe, expect, it } from "vitest";
import type { Database } from "./client";
import { guarded } from "./guarded";

/** Una base que no se conecta a nada y anota cada sentencia que se le manda. */
function recordingDb() {
  const sent: string[] = [];
  const db = new Kysely({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (k) => new PostgresIntrospector(k),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
    log: (e) => void sent.push(e.query.sql),
  }) as unknown as Database;
  return { db, sent };
}

describe("guarded (savepoint)", () => {
  it("si todo sale bien, suelta el savepoint y devuelve el resultado", async () => {
    const { db, sent } = recordingDb();
    expect(await guarded(db, async () => "ok", () => "error")).toBe("ok");
    expect(sent).toEqual(["savepoint guarded", "release savepoint guarded"]);
  });

  it("si la base lo rechaza y se sabe qué devolver, vuelve al savepoint y devuelve eso", async () => {
    const { db, sent } = recordingDb();
    const result = await guarded(
      db,
      async () => Promise.reject(new Error("23505")),
      (e) => (e instanceof Error && e.message === "23505" ? "repetido" : undefined),
    );
    expect(result).toBe("repetido");
    expect(sent).toEqual(["savepoint guarded", "rollback to savepoint guarded"]);
  });

  it("un error que no se sabe manejar vuelve al savepoint y sigue de largo", async () => {
    const { db, sent } = recordingDb();
    await expect(guarded(db, async () => Promise.reject(new Error("otro")), () => undefined)).rejects.toThrow("otro");
    expect(sent).toEqual(["savepoint guarded", "rollback to savepoint guarded"]);
  });
});
