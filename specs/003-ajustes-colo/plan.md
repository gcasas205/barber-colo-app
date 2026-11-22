# Plan — Spec 003: Ajustes de Colo

Estado: aprobado (2026-11-21, "aplica la spec completa") · Spec: [`spec.md`](spec.md) · Clarificación: [`clarificacion.md`](clarificacion.md)

## 0. Resumen

Una pantalla `/colo/ajustes` con cuatro secciones (Horarios, Bloqueos, Servicios, Reserva y contacto), cada
una con su formulario y su botón de guardar. Las reglas son funciones puras en los dominios de Agenda
(`schedule`) y Precios (`pricing`) que corren en el navegador (para mostrar el error al lado del campo) y en
el servidor (la fuente de verdad, RF-3). Las escrituras pasan por casos de uso que reciben el actor y
corren dentro de una transacción que bloquea la fila de ajustes (clarificación 6).

## 1. Cambios de esquema (migración `20261122100000_settings_admin.sql`)

| Cambio | Por qué | RF |
|---|---|---|
| `schedule_blocks.reason` → `notice`, `check (char_length(notice) between 1 and 80)` | El aviso es público y corto | RF-10, RF-14 |
| `schedule_blocks.created_by uuid references auth.users on delete set null` | Quién lo cargó (pendiente de la 001) | RF-27 |
| Tabla `app.settings_changes (id, changed_by uuid not null, changed_at, area, detail jsonb)` con RLS | Auditoría de cada cambio | RF-27 |
| Grants a `app_server`: `update` en `schedule_settings`; `insert, delete` en `weekly_ranges` y `schedule_blocks`; `insert, update` en `services`; `insert, select` en `settings_changes` | Mínimo para escribir (RNF-1) | RF-5 a RF-24 |

Vuelta atrás: una migración que revierte los grants (los datos no se tocan). En producción no hay
bloqueos cargados, así que renombrar la columna no pierde nada.

## 2. Dominio (funciones puras, con tests)

**`src/modules/schedule/domain/settings.ts`**
- `SETTINGS_LIMITS`: 4 franjas por día, anticipación 0 a 2880 min de a 15, días a futuro 1 a 90, aviso 80.
- `validateWeeklyRanges(ranges, step)`: lo de RF-12 de la 001 más "múltiplo del paso" y "máximo 4 por día";
  errores por día (RF-6).
- `copyDay(ranges, from, to[])` (RF-7).
- `validateStepChange(step, ranges, services)` → servicios y días a ajustar (RF-9).
- `validateBookingRules({ minNoticeMinutes, maxAdvanceDays })` (RF-22, RF-24).
- `blockOfDays(first, last)`, `blockOfHours(day, from, to)` → `Interval` con `instantAt` (RNF-2) y
  `validateBlock(draft, now)` (RF-11), `validateNotice(text)`.
- `isWhatsapp(e164)`: `^\+549\d{10}$`. La normalización la hace la interfaz con `normalizeArPhone` de
  Clientes (su `index.ts`), así Agenda no depende de Clientes.

**`src/modules/schedule/domain/notices.ts`**
- `weekNotices(week, notices)` → `{ date, kind: "closed" | "hours", from?, to?, text }[]` (RF-14).

**`src/modules/pricing/domain/service.ts`** (se amplía)
- `validateService` suma nombre de 1 a 60, descripción hasta 200, precio hasta $ 9.999.999 y duración de un
  paso a 600 min (RF-17).
- `moveService(order, id, "up" | "down")` (RF-18).

## 3. Aplicación (casos de uso, con repositorios en memoria)

- `schedule/application/manage-settings.ts`: `saveWeeklyRanges`, `changeStep`, `saveBookingRules`,
  `saveContact`, `addBlock`, `removeBlock`, `listCurrentBlocks`. Todos exigen `actor.kind === "barber"`
  (RF-2) y registran en la auditoría (RF-27).
- `pricing/application/manage-services.ts`: `listAllServices`, `saveService`, `moveServiceOrder`,
  `deactivateService` (con `confirmLast`, RF-21), `reactivateService` (RF-20).
- Puertos nuevos: `ScheduleAdmin` (con `lockSettings()`), `ServiceAdmin`, `SettingsAudit`. El paso que
  necesita Precios y las duraciones que necesita Agenda llegan como funciones que arma `src/server`.

## 4. Infraestructura y armado

- `schedule/infrastructure/schedule-admin.ts` y `pricing/infrastructure/service-admin.ts` (Kysely).
- `src/server/settings.ts`: abre `db.transaction()`, arma los dos repositorios sobre esa transacción,
  bloquea la fila de ajustes y corre el caso de uso (clarificación 6). La auditoría vive acá (una tabla
  para los dos módulos).
- El nombre repetido lo frena también el índice único (código 23505 → `NAME_TAKEN`).

## 5. Interfaz

- `/colo/ajustes` (`instant = false`, CSP con nonce, sin `<Suspense>`) con las secciones; enlace "Ajustes"
  desde el panel de Colo. Sin rol de barbero: la pantalla de RF-8 de la 002 (RF-2).
- Componentes cliente por sección, con `useActionState` y errores junto al campo (RNF-4).
- `useUnsavedGuard(dirty)`: `beforeunload` y confirmación al tocar un enlace (RF-26).
- Sacar el último servicio: segundo botón "Sí, sacarlo" en el lugar, no un diálogo del navegador (RF-21).
- Página pública: la foto suma `notices` (solo bloqueos con aviso) y `BookingView` lista los avisos de la
  semana (RF-14).

## 6. Tests

| Nivel | Qué cubre |
|---|---|
| Dominio | Casos límite 1 a 14, rangos, bloqueos en tres zonas horarias |
| Aplicación | RF-2 (cliente e invitado rechazados), auditoría, RF-20, RF-21 |
| Integración (base local) | Grants, transacción completa de franjas (caso 16), índice de nombres, aviso en la foto |
| Componentes | Errores junto al campo, avisos de la semana |
| e2e (`tests/e2e/ajustes.py`) | Colo demo cambia todo y la pública lo refleja; un cliente no entra (caso 15); velocidad (RNF-5) |

## 7. Pasos en producción

1. Fusionar el PR; el job `deploy` aplica la migración (con aprobación de Gonzalo en el entorno `production`).
2. e2e en producción con Colo demo, dejando todo como estaba al terminar.
3. Gonzalo carga las franjas definitivas cuando las confirme con Colo.

## 8. Decisiones técnicas

| Decisión | Alternativa descartada |
|---|---|
| Una pantalla con secciones | Una ruta por sección: más navegación en el celular para cambios chicos |
| Franjas: se reemplazan todas en una transacción | Editar franja por franja: estados intermedios inválidos (superposiciones) |
| Bloqueo de la fila de ajustes | Triggers en la base: lógica duplicada fuera del dominio |
| Aviso en la foto solo si hay texto | Mandar todos los bloqueos con motivo: rompe S-7 |
| Confirmación del navegador en RF-26 | Interceptar el router de Next: no hay API estable para eso |

## 9. Cobertura

RF-1 a RF-3 → §3 y §5 · RF-4 a RF-7 → §2 y §5 · RF-8, RF-9 → §2 · RF-10 a RF-14 → §2, §5 · RF-15 a RF-21 →
§2, §3 · RF-22 a RF-24 → §2 · RF-25 a RF-28 → §3, §5 · RNF-1 → §1 · RNF-2, RNF-3 → §2 · RNF-4, RNF-5 → §5, §6.
