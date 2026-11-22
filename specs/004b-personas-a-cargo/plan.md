# Plan — Spec 004b: Personas a cargo

Estado: aprobado (2026-11-22) · Spec: [`spec.md`](spec.md)

## Esquema

Sin tablas nuevas: `app.customers` ya tiene `role = 'dependent'` con la cuenta del titular y sin contacto
(`customers_dependent_no_contact`). La migración `20261122140000_dependents.sql` solo agrega un índice
parcial por cuenta y rol (`account_user_id, role`), para contar y listar las personas de una cuenta.

## Dominio y casos de uso

- `customers/domain/dependent.ts`: `DEPENDENTS_LIMIT = 5`, `validateDependent({ name, birthday })` (reusa las
  reglas de nombre y cumpleaños de la 002), `demoName(name, isDemo)`.
- `customers/application/dependents.ts`: `listDependents`, `addDependent` (bloquea la fila del titular y
  cuenta), `updateDependent`, `removeDependent` (pregunta a Turnos si tiene turno futuro: lo arma `src/server`).
  Todos exigen `actor.kind === "customer"` con titular.
- Turnos (`appointments`): `book` recibe `forCustomerId` opcional; el titular puede reservar para una
  persona de su cuenta (`tx.accountMember`). `getMyAppointments` devuelve los turnos futuros de toda la
  cuenta y los avisos de Colo de toda la cuenta. Cancelar y reprogramar aceptan turnos de la cuenta.
- Agenda: el turno de una persona a cargo trae `holderName` y el celular del titular.

## Interfaz

- `/perfil`: sección "Personas a cargo" (lista, agregar, editar en el lugar, quitar con el turno a la vista).
- `/turnos`: "¿Para quién es el turno?" (si hay personas a cargo), "Tus turnos" con una tarjeta por persona,
  y "Reservá otro turno" debajo mientras alguien pueda reservar.
- Agenda: "Tomi · a cargo de Martín".

## Tests

Dominio y casos de uso en memoria (casos 1 a 9), integración (límite de 5 con dos pedidos a la vez, un turno
por persona, anonimizar), e2e `tests/e2e/a_cargo.py` (local y producción, deja todo como estaba).
