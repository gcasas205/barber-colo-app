# Plan — Spec 004: Reservar, cancelar y reprogramar

Estado: aprobado (2026-11-22, "sigue con la spec 4 completa") · Spec: [`spec.md`](spec.md) · Clarificación: [`clarificacion.md`](clarificacion.md)

## 0. Resumen

Un módulo nuevo **Turnos** (`src/modules/appointments`) con la lógica pura de plazos y estados, sus casos
de uso y su repositorio. La página de horarios pasa a `/turnos` (con sesión) y suma elegir, reservar y "Tu
turno". La dirección principal es el ingreso. El panel de Colo abre en la agenda del día. La base garantiza
que no haya dos turnos activos superpuestos (restricción de exclusión).

## 1. Esquema (migración `20261122120000_appointments.sql`)

| Cambio | Por qué | RF |
|---|---|---|
| Enum `appointment_status` (`reserved`, `confirmed`, `cancelled`, `cancelled_late`) | Estados de esta spec; 007 y 008 suman los suyos | RF-8, RF-14, RF-15 |
| Tabla `appointments` (cliente, servicio, `period tstzrange`, estado, precio congelado, reprogramaciones del cliente, reservado a las) con `exclude using gist (period with &&) where (estado activo)` | Nunca dos activos superpuestos, aunque reserven a la vez | RF-8, RF-12, RNF-2 |
| Tabla `appointment_events` (turno, cuándo, quién: cliente o barbero, usuario, tipo, horario anterior y nuevo, tarde, motivo, `seen_by_customer_at`) | Historial (I-7) y aviso al cliente de lo que hizo Colo | RF-20, RF-29 |
| Tabla `agenda_views` (usuario barbero, visto a las) | "Nuevo" en la agenda | RF-22, RF-23 |
| Grants a `app_server`: `select, insert, update` en las tres; `select` y `update` sobre clientes para bloquear la fila | Mínimo (RNF-3); nada de `delete` | RNF-3 |
| pg_cron: borrar usuarios anónimos de más de 60 días sin actividad ni cliente | Sesiones de invitado abandonadas | RF-31 |

## 2. Dominio de Turnos (`appointments/domain/policy.ts`, funciones puras)

- `APPOINTMENT_POLICY`: 240 min de plazo, 10 min de margen, 60 min para nacer Confirmado, 2 reprogramaciones.
- `initialStatus(start, now)` (RF-8, caso 8) · `isUpcoming(appt, now)`: fin > ahora (clarificación 2).
- `changeTiming(appt, now)` → `on_time` | `late` | `started` (RF-14, RF-15, RF-17, RF-19; casos 3 a 5).
- `customerCanReschedule(appt, now)` (RF-18, RF-19) · `validateBarberReason(text)` 3 a 200 (RF-24, RF-25).

## 3. Agenda (se amplía)

- `schedule/domain/settings.ts`: `intervalsOutside(intervals, ranges)` y `intervalsInside(intervals, block)` para
  RF-27.
- `ScheduleAdminTx` suma `upcomingAppointments()` (lo da Turnos vía `src/server`); `saveWeeklyRanges` y
  `addBlock` devuelven `APPOINTMENTS_AFFECTED` con la lista.
- La foto de la agenda suma los turnos activos como lapsos ocupados (sin quién, S-7).

## 4. Clientes e identidad (se ajustan)

- `resolveActor`: sesión anónima sin cliente = invitado con `customerId: null` (antes "sin actor").
- `enterAsGuest`: solo el límite de intentos y la sesión anónima (clarificación 9).
- `saveContact(actor, name, phone)`: completa nombre y celular de un cliente con cuenta (sin tocar el
  cumpleaños) o crea / reconoce al invitado y asocia el dispositivo (RF-7, RF-11).

## 5. Casos de uso de Turnos (`appointments/application`)

`book`, `getMyAppointment` (con el aviso de Colo sin ver), `dismissBarberNotice`, `cancelByCustomer`,
`rescheduleByCustomer`, `getDayAgenda`, `cancelByBarber`, `rescheduleByBarber`. Cada uno en una
transacción que bloquea la fila de ajustes en modo compartido y la del cliente (clarificación 3 y 4),
recalcula los horarios libres con `dayStarts` de Agenda (con los datos de la base, no del navegador) y
deja el evento en el historial. Puertos: `AppointmentsStore`, `SlotChecker`, `ServiceLookup`.

## 6. Interfaz

| Ruta | Qué | RF |
|---|---|---|
| `/` | Ingreso (lo que era `/ingresar`); con sesión redirige | RF-1, RF-2 |
| `/ingresar` | Redirige a `/` (enlaces viejos) | RF-3 |
| `/turnos` | Horarios + elegir + resumen con datos faltantes + "Tu turno" + aviso de Colo | RF-6 a RF-20 |
| `/colo` | Agenda del día (flechas, "Nuevo", cancelar y mover con motivo, avisos de bloqueo) | RF-21 a RF-26 |
| `/colo/clientes` | La lista de clientes que hoy está en `/colo` | RF-21 |

Todas con sesión, CSP con nonce y `instant = false`. La CSP fija queda solo para `/prototipo`.

## 7. Tests

Dominio (casos 2 a 8, 14, 16), casos de uso con repositorios en memoria (RF-10, RF-11, RF-18, RF-20,
RF-24, RF-25, RF-27), integración (exclusión con dos reservas a la vez, caso 1; bloqueo de cliente, caso 13;
precio congelado, casos 9 y 10; grants), componentes, y e2e `tests/e2e/turnos.py` (local y producción,
deja todo cancelado) con la velocidad de RNF-1.

## 8. Decisiones técnicas

| Decisión | Alternativa descartada |
|---|---|
| Restricción de exclusión en la base | Solo validar en el código: dos reservas simultáneas pasarían |
| El servidor recalcula los horarios libres con el mismo `dayStarts` | Confiar en el horario que manda el navegador |
| Un evento por cambio (historial) y el aviso al cliente sale de ahí | Columnas sueltas en el turno: se pierde el historial |
| Datos del cliente primero, reserva después | Una sola transacción entre módulos: acopla Clientes y Turnos |
| `/turnos` con la foto de la agenda (cálculo en el dispositivo) | Pedir horarios al servidor en cada cambio: más lento |
