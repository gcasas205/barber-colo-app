# Validación — Spec 004b: Personas a cargo

Fecha: 2026-11-22. Recorrido RF por RF contra los tests (en verde: unitarios, integración con la base local) y el
e2e local `tests/e2e/a_cargo.py` (19 comprobaciones), más `turnos.py`, `pestanas.py`, `ajustes.py`, `login.py`,
`booking.py` y `csp.py` sin regresiones. Falta T5 (producción).

| RF | Cómo se verifica | Resultado |
|---|---|---|
| RF-1 | e2e: "Personas a cargo" en Mi perfil; un invitado no la ve (solo titulares, `listDependents` vacío) | ✅ |
| RF-2 | `dependent.test.ts` y `dependents.test.ts` (nombre, cumpleaños, "(demo)"); e2e (sin nombre no se agrega; con cumpleaños) | ✅ |
| RF-3 | `dependents.test.ts` (sexta: `LIMIT`); integración: dos altas a la vez con 4 dejan 5 (RNF-1); la pantalla oculta "Agregar" con 5 | ✅ |
| RF-4 | `dependents.test.ts` (mismas reglas, conserva "(demo)"); e2e (editar y queda guardado) | ✅ |
| RF-5 | `dependents.test.ts` e integración (anonimizada: "Cliente dado de baja", sin cumpleaños); e2e (se quita y no aparece) | ✅ |
| RF-6 | `dependents.test.ts` (`HAS_UPCOMING`); integración (con turno no, cancelado sí, en la misma transacción); e2e (muestra el turno y "Ir a los turnos") | ✅ |
| RF-7 | `dependents.test.ts` (invitado, Colo y otra cuenta: `NOT_ALLOWED`, nada cambia) | ✅ |
| RF-8 | e2e ("¿Para quién es el turno?"; quien tiene turno no se elige, con "Ya tiene turno: …") | ✅ |
| RF-9 | `use-cases.test.ts` (caso 1, a nombre del hijo); integración; e2e ("Reserva para Tomi Prueba") | ✅ |
| RF-10 | `use-cases.test.ts` (caso 2); integración: dos turnos para el mismo hijo a la vez, se crea uno; e2e (titular e hijo seguidos) | ✅ |
| RF-11 | El nombre y el celular del titular se piden en el mismo resumen si faltan (mismo `contact` que la 004) | ✅ |
| RF-12 | `use-cases.test.ts` (el titular cambia y cancela el turno del hijo); e2e ("Tus turnos", "Para Tomi Prueba", "Para vos") | ✅ |
| RF-13 | e2e ("Reservá otro turno" mientras alguien puede; sin él cuando todos tienen turno) | ✅ |
| RF-14 | `use-cases.test.ts` (caso 7); e2e ("Colo canceló el turno de Tomi Prueba" con el motivo) | ✅ |
| RF-15 | `use-cases.test.ts` (caso 8: otra cuenta e invitado, `NOT_ALLOWED` / `NOT_FOUND`) | ✅ |
| RF-16 | `use-cases.test.ts` e integración (`holderName` y celular del titular); e2e ("A cargo de", WhatsApp del titular) | ✅ |
| RNF-1 | Integración: límite de 5 y un turno por persona con pedidos a la vez (bloqueo de la fila del titular y de la persona) | ✅ |
| RNF-2 | Solo nombre y cumpleaños (sin contacto, `customers_dependent_no_contact`); al quitar se borran (`anonymize`) | ✅ |
| RNF-3 | CSP sin bloqueos (`csp.py`); botones con nombre accesible ("Editar a Tomi"); `DESIGN.md` (un solo botón rojo) | ✅ |

## Hallazgos durante la implementación

- Quitar una persona miraba sus turnos con otra transacción: con el pool de una conexión (ADR-02) se trababa,
  también en producción. Ahora la consulta va en la misma transacción y bloquea la fila de la persona, la misma
  que bloquea la reserva (así no se cruzan quitar y reservar).

## Veredicto

La spec se cumple. **En producción** (PR #23, 2026-11-22): `a_cargo.py https://barber-colo.vercel.app` 20/20 en verde,
con una persona a cargo extra cargada a mano en la cuenta de prueba ("Pibe1"): se sigue ofreciendo reservar solo para ella.
