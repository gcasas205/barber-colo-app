# Plan — Spec 001: Agenda, servicios y horarios libres

Estado: aprobado (2026-11-21)
Spec: [`spec.md`](spec.md) (aprobada) · Diseño: `docs/diseno/01` a `04`, `DESIGN.md`

## 1. Resumen

Se construye de adentro hacia afuera: primero las reglas puras (fechas, agenda, disponibilidad) con
sus tests, después la base de datos con la configuración inicial, después los casos de uso de
consulta y por último la página pública `/`. Es la primera spec con código de producto: además deja
armados el kernel compartido, el acceso a datos, el test de arquitectura y el job de CI con base de
datos, que usan todas las specs siguientes.

## 2. Dependencias nuevas (versiones fijas)

| Paquete | Versión | Para qué | Por qué este |
|---|---|---|---|
| `kysely` | 0.29.9 | SQL tipado con transacciones (ADR-03) | — |
| `pg` + `@types/pg` | 8.23.1 | Driver de Postgres | Es el dialecto que Kysely trae incorporado. **Cambia respecto de ADR-03**, que nombraba `postgres` (postgres.js): esa opción necesita un paquete extra de dialecto |
| `date-fns` + `@date-fns/tz` | 4.4.0 / 1.5.0 | Calendario en hora de Buenos Aires (ADR-09) | — |
| `zod` | 4.6.7 | Validar los parámetros de la URL (ADR-10) | — |
| `kysely-codegen` (dev) | 0.20.0 | Generar los tipos de las tablas desde la base | — |
| `supabase` (dev) | 3.2.0 | CLI: base local, migraciones, `db advisors` | — |

## 3. Archivos y responsabilidades

```text
src/shared/kernel/
  zone.ts            Zona del negocio (constante) y conversiones local ↔ instante con TZDate.   RNF-1
  local-date.ts      LocalDate ("AAAA-MM-DD"): crear, sumar días, día de la semana ISO, semana (lun–dom). RNF-1
  minutes.ts         Hora del día como minutos (600 = 10:00) y su formato "10:00".
  money.ts           Centavos → "$ 18.000" (formatPesos).                                       RF-3
  duration.ts        Minutos → "30 min", "2 h", "1 h 30 min" (formatDuration).                  RF-3
  result.ts          Result<T, E> para errores de negocio.
src/shared/db/
  client.ts          Kysely + Pool de pg (una conexión por instancia, pooler de Supabase).
  types.ts           Generado por kysely-codegen. No se edita a mano.
src/shared/config/env.ts   Variables de entorno validadas con Zod (DATABASE_URL).

src/modules/schedule/
  domain/schedule.ts        Tipos: ScheduleConfig, WeeklyRange, Block, Interval.
  domain/validate.ts        validateSchedule, validateBlock.                                   RF-12, RF-14
  domain/availability.ts    bookingWindow, dayStarts, weekAvailability, nextDayWithRoom.        RF-4 a RF-11
  application/ports.ts      ScheduleRepository, OccupationSource (en esta spec devuelve solo bloqueos).
  application/get-availability.ts   Caso de uso de consulta (día o semana para un servicio).
  infrastructure/schedule-repository.ts   SQL con Kysely.
  index.ts                  API pública del módulo.
src/modules/pricing/
  domain/service.ts         Tipo Service y validateService.                                    RF-13
  application/list-services.ts      Servicios activos en orden.                                RF-1, RF-2
  infrastructure/service-repository.ts
  index.ts
src/server/composition.ts   Arma los casos de uso con sus repositorios (ADR, backend §3).

src/app/page.tsx            Página pública: servicios, semana, día y horarios.                  RF-1 a RF-7, RF-2b, RF-6b
src/app/_reservar/*.tsx     Piezas de la página (lista de servicios, semana, horarios, vacíos).
src/ui/…                    Se reutilizan los componentes del prototipo (`DESIGN.md`).

supabase/config.toml
supabase/migrations/        Ver sección 4.
tests/architecture.test.ts  Capas y módulos (ADR de arquitectura).
tests/integration/*.test.ts Contra el Postgres local de Supabase.
```

`src/app/prototipo/` queda como está (referencia de diseño, sin indexar).

## 4. Base de datos (migraciones SQL)

| Migración | Contenido | Cubre |
|---|---|---|
| `…_base.sql` | Extensiones `btree_gist`; esquemas `app` y `stats`; rol `app_server` **sin contraseña** (la pone una persona, T1); permisos de uso; quita permisos de `anon` y `authenticated` sobre `app` | ADR-02, DB §5 |
| `…_schedule.sql` | `schedule_settings` (1 fila: `step_minutes in (5,10,15,20,30,60)`, `min_notice_minutes`, `max_advance_days`, `contact_whatsapp`); `weekly_ranges` (`weekday 1–7`, `closes_at > opens_at`, exclusión GiST por día y `tsrange` sobre una fecha fija); `schedule_blocks` (`period tstzrange`, no vacío, índice GiST); RLS con política solo para `app_server` | RF-12, RF-14, RNF-5 |
| `…_services.sql` | `services` (`price_cents > 0`, `duration_minutes > 0`, `counts_for_benefits`, `position`, `deactivated_at`); índice único parcial por `lower(trim(name))` entre activos; RLS | RF-13, RF-2 |
| `…_initial_config.sql` | **Datos iniciales** de la spec (franjas, paso, anticipación, contacto, tres servicios). Es una migración y no `seed.sql`, porque tiene que existir también en producción | Definiciones de la spec |

Que la duración sea múltiplo del paso lo valida el dominio (las dos cosas viven en tablas distintas);
la base garantiza precio positivo, duración positiva, nombre único y franjas sin superposición.

## 5. Funciones puras (firmas)

```ts
type LocalDate = string;                 // "2026-11-26"
type MinuteOfDay = number;               // 0–1440
type WeeklyRange = { weekday: 1|2|3|4|5|6|7; opensAt: MinuteOfDay; closesAt: MinuteOfDay };
type Interval = { start: Date; end: Date };            // instantes; extremo final abierto
type ScheduleConfig = { stepMinutes: number; minNoticeMinutes: number; maxAdvanceDays: number };

bookingWindow(now: Date, maxAdvanceDays: number): { first: LocalDate; last: LocalDate }
dayStarts(input: {
  date: LocalDate; ranges: WeeklyRange[]; config: ScheduleConfig;
  serviceMinutes: number; occupations: Interval[]; now: Date;
}): Array<{ start: Date; label: string; range: { opensAt: MinuteOfDay; closesAt: MinuteOfDay } }>
weekAvailability(input: Omit<…, "date"> & { weekOf: LocalDate }): Array<{ date: LocalDate; count: number; inWindow: boolean }>
nextDayWithRoom(input: Omit<…, "date"> & { after: LocalDate }): LocalDate | null
validateSchedule(ranges: WeeklyRange[], config: ScheduleConfig): Result<void, ScheduleError[]>
validateService(s: Service, stepMinutes: number, activeNames: string[]): Result<void, ServiceError[]>
validateBlock(b: Interval): Result<void, "BLOCK_EMPTY">
```

## 6. Algoritmo de `dayStarts`

```text
si date está fuera de bookingWindow(now) → []
para cada franja del día de la semana de date (ordenadas por apertura):
  para m desde opensAt, mientras m + serviceMinutes <= closesAt, de a stepMinutes:      (RF-8)
    inicio = instante local(date, m) ; fin = inicio + serviceMinutes                   (RNF-1, sin sumar milisegundos de días)
    si inicio - now < minNoticeMinutes → saltear                                       (RF-10; con exactamente 30 sí)
    si [inicio, fin) se superpone con alguna ocupación [a, b) → saltear                (RF-9; tocar el borde no es superponer)
    agregar { inicio, etiqueta "HH:MM", franja }
devolver ordenado por inicio                                                           (RF-7)
```

`weekAvailability` cuenta `dayStarts` para los 7 días de la semana (lunes a domingo) que contiene
`weekOf`; marca `inWindow` para deshabilitar los días fuera de la ventana. `nextDayWithRoom` recorre
día por día hasta el final de la ventana. Con 31 días, 3 servicios y pasos de 15 min, son unos pocos
miles de comparaciones: no hace falta optimizar.

## 7. Interfaz (página pública `/`)

- **Estado en la URL** (`/?servicio=corte&dia=2026-11-26`): el servidor calcula todo y la página
  funciona sin JavaScript, se puede compartir el enlace ("mirá, el jueves hay lugar") y el botón
  "atrás" del celular hace lo esperable. Elegir servicio, semana o día son enlaces.
- **Estructura** (`DESIGN.md`):
  1. chapa superior con la insignia y "EL COLO";
  2. servicios como opciones grandes, con qué incluyen, duración y precio;
  3. semana con flechas ‹ › y siete días con su cantidad de horarios o "sin lugar";
  4. horarios del día agrupados por franja;
  5. pie con el WhatsApp de El Colo.
- **Valores por defecto:** el primer servicio y el primer día con lugar de la ventana.
- **Estados:**
  - sin servicios: RF-2b;
  - día sin lugar con el próximo día que sí tiene: RF-6;
  - sin lugar en toda la ventana: RF-6b;
  - carga: `BrandLoader`, UI-01.
- Los horarios se muestran como opciones informativas. Como todavía no hay reserva (spec 003), una
  línea aclara "Muy pronto vas a poder reservar desde acá. Mientras tanto, escribile a Colo", con el
  WhatsApp.
- **Caché:** los servicios y la configuración se leen con `use cache` y una etiqueta de caché; la
  disponibilidad depende de "ahora", así que se calcula en cada pedido detrás de `<Suspense>` (ADR-11).

## 8. Decisiones técnicas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Estado en la URL y cálculo en el servidor | Estado en el cliente con llamadas a una API | Funciona sin JS, enlaces compartibles, menos código y una sola fuente de "ahora" (el servidor) |
| `pg` con el dialecto incorporado de Kysely | `postgres` (postgres.js) + `kysely-postgres-js` | Un paquete menos y el dialecto oficial; se registra el cambio en ADR-03 |
| Configuración inicial como migración | `seed.sql` | `seed.sql` solo corre en la base local; la configuración tiene que existir en producción |
| Puerto `OccupationSource` en Agenda | Que Agenda lea los turnos | Bajo acoplamiento: en la spec 003 Turnos aporta sus ocupaciones sin que Agenda lo conozca |
| `LocalDate` como texto `AAAA-MM-DD` | Objetos `Date` para días | Un día no es un instante; el texto evita desfases de zona y se compara y guarda sin conversión |
| Rango final abierto `[inicio, fin)` | Rangos cerrados | Que un turno empiece justo cuando termina otro no sea "superposición" (RF-9), igual que `tstzrange '[)'` en la base |

## 9. Estrategia de tests

| Nivel | Qué | Cubre |
|---|---|---|
| Unidad (Vitest, `TZ` de Buenos Aires y también con `TZ=UTC` y `TZ=Asia/Tokyo`) | Kernel de fechas y montos; `dayStarts` con los **12 casos límite** de la spec como tabla de casos con `now` fijo; `weekAvailability`, `nextDayWithRoom`, validaciones | RF-3 a RF-14, RNF-1, RNF-2 |
| Aplicación | `getAvailability` y `listServices` con repositorios en memoria | RF-1, RF-2, RF-2b, RF-6b |
| Arquitectura | El dominio no importa nada fuera del kernel; los módulos solo se usan por su `index.ts`; solo `src/server` importa `infrastructure` | Constitución, principio 3 |
| Integración (Supabase local) | Migraciones aplican desde cero; restricciones: franjas superpuestas, paso inválido, precio 0, nombre duplicado, bloqueo vacío; RLS activado en todas las tablas; `anon` no lee `app`; la configuración inicial está | RF-12 a RF-14, RNF-5, ADR-02 |
| Página | Server Component renderizado con datos fijos: estados vacíos y agrupación por franja | RF-2b, RF-6, RF-6b, RF-7 |
| Manual | Página en 360 px, web, teclado, modo oscuro; deploy de prueba | RNF-3, RNF-4 |

Para correr los tests con otras zonas horarias se agrega el script `npm run test:tz`, que repite la
suite con `TZ=UTC` y `TZ=Asia/Tokyo`. Corre en CI.

## 10. CI/CD (cambios en `.github/`, requieren tu aprobación)

1. **Job `integration`**: levanta Supabase local (`supabase start`), aplica las migraciones, genera
   los tipos y verifica que no cambien (`git diff --exit-code src/shared/db/types.ts`), y corre
   `tests/integration` y `supabase db advisors`. El job `deploy` pasa a esperar a `checks` **y** a
   `integration`.
2. **Migraciones dentro del job `deploy`** (solo en `main`, en el entorno `production`): primero
   `supabase db push --remote="$SUPABASE_DB_URL" --dry-run` (muestra qué se va a aplicar), después
   el `push` real y recién entonces el deploy. Van en el mismo job y no en uno aparte para que
   alcance **una sola aprobación** tuya por cada pase a producción (cada job con entorno protegido
   pide la suya). No usa token de acceso (S-1). Si falta el secreto, se saltea con un aviso. En
   `main` no se cancelan corridas en curso. *(El CLI 3.x reemplazó `--db-url` por `--remote=<url>`.)*

## 10b. Seguridad

| # | Riesgo | Medida | Se verifica con |
|---|---|---|---|
| S-1 | Un token de Supabase con acceso a toda la cuenta guardado en GitHub | No se usa token de acceso. Las migraciones se aplican con `supabase db push --remote=<url>`, con la contraseña de la base guardada en el **entorno `production` de GitHub**, que solo usa `main` y pide tu aprobación antes de correr | Configuración del entorno en GitHub (T1) |
| S-2 | Conexión a la base sin verificar el certificado (suplantación) | `pg` con `ssl: { ca: <certificado de Supabase>, rejectUnauthorized: true }`. Prohibido `rejectUnauthorized: false`: hay un test que busca ese texto en el código | Test + conexión real en T10 |
| S-3 | Permisos de más en el rol de la app | En la 001, `app_server` solo tiene `SELECT` en las tablas de agenda y servicios. Cada spec agrega los permisos que necesita | Test de integración: un `INSERT` como `app_server` falla |
| S-4 | Base expuesta a la API pública de Supabase | Los esquemas `app` y `stats` no se publican; se revocan los permisos de `anon` y `authenticated` (también los predeterminados para tablas futuras); RLS activado en todas las tablas | Tests de integración + `supabase db advisors` |
| S-5 | Ataques desde el navegador (embeber la app, scripts ajenos) | Cabeceras en `next.config.ts`: CSP fija (solo recursos propios; `'unsafe-inline'` en scripts porque la CSP con *nonce* obliga a renderizar todo en cada pedido y no es compatible con el prerenderizado parcial; **se revisa en la 002**, cuando haya sesión), `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` y HSTS | Test que verifica las cabeceras de la respuesta |
| S-6 | Parámetros de la URL manipulados | Validados con Zod. Si un valor es inválido o la fecha está fuera de la ventana, se usan los valores por defecto. Las consultas van siempre con parámetros (Kysely) | Tests de la página |
| S-7 | Datos de más en la página pública | Solo se muestran los horarios libres, nunca quién ocupa un horario ni el motivo de un bloqueo | Revisión del caso de uso: devuelve solo inicios |

Los usuarios de prueba (D-11) no entran en esta spec: llegan con el login, en la 002.

## 11. Pasos de una persona (Supabase y secretos)

| Paso | Quién | Cómo se verifica | Cómo se vuelve atrás |
|---|---|---|---|
| Crear el proyecto `barber-colo` en Supabase (región São Paulo, plan gratuito) | Vos | Me pasás el *project ref* | Borrar el proyecto |
| Crear el entorno `production` en GitHub, limitado a `main` y con tu aprobación obligatoria | Vos | Aparece en Settings → Environments | Borrar el entorno |
| Cargar `SUPABASE_DB_URL` como secreto de ese entorno | Vos | El job `migrate` corre en verde | Borrar el secreto |
| Después del primer `migrate`: poner contraseña a `app_server` (SQL que te paso) y cargar en Vercel `DATABASE_URL` (pooler, modo transacción) (el certificado de Supabase ya viene en el código) | Vos | La página `/` del deploy muestra los servicios | Quitar la variable |

## 12. Cobertura

| RF / RNF | Dónde |
|---|---|
| RF-1, RF-2, RF-2b | `listServices`, página |
| RF-3 | `money.ts`, `duration.ts` |
| RF-4, RF-5 | `weekAvailability`, página |
| RF-6, RF-6b | `nextDayWithRoom`, página |
| RF-7 a RF-11 | `dayStarts` |
| RF-12, RF-14 | `validate.ts` + restricciones SQL |
| RF-13 | `validateService` + restricciones SQL |
| RNF-1, RNF-2 | kernel, tests con tres zonas |
| RNF-3, RNF-4 | página, verificación manual |
| RNF-5 | migración de configuración inicial |
| Seguridad (constitución) | sección 10b |


## Cambio 01 (aprobado el 2026-11-21)

Spec: sección "Cambio 01". Reemplaza a la sección 7 en lo que se contradiga (el estado ya no va en la URL).

### Qué cambia y por qué

| Antes | Ahora | Por qué |
|---|---|---|
| Cada elección pedía la página al servidor (`?servicio=…`) | El servidor manda una sola vez una **foto de la agenda** del mes (franjas, paso, anticipación, bloqueos de la ventana, servicios, contacto y la hora del servidor) y el navegador calcula con el **mismo dominio puro** de T4 | Cambiar servicio, día o semana pasa de un viaje al servidor (~1 s) a un cálculo local (< 200 ms); la dirección queda fija (RF-15, RNF-3) |
| Funciones de Vercel en Washington (`iad1`, por defecto) | `vercel.json` → `"regions": ["gru1"]` (São Paulo) | La base está en São Paulo: cada consulta deja de cruzar el continente |
| "Ahora" del pedido | Hora del servidor al cargar + tiempo transcurrido (`performance.now()`), recalculado cada minuto | Un celular con la hora mal no ve horarios falsos (caso 14); la página abierta se mantiene al día (RF-16) |
| Días sin lugar tocables | Días sin lugar no se pueden elegir (RF-5) | Validación |
| `addDays` sumando milisegundos en UTC | `Date.UTC(año, mes, día + n)` | Letra del principio 6 |
| Precio con centavos permitido | Dominio y base rechazan centavos (`price_cents % 100 = 0`, migración nueva) | RF-3, RF-13 |

### Seguridad de la foto de la agenda
- Solo lleva horarios de ocupación (inicio y fin), nunca quién ocupa ni el motivo de un bloqueo (S-7). Desde la spec 003, los turnos entran igual: solo como lapsos ocupados.
- Es una vista para mirar: cuando exista la reserva (spec 003), el servidor vuelve a validar el horario contra la base. El cálculo del navegador nunca es la autoridad.

### Tema (RF-17)
- Control de tres opciones en la chapa superior (Claro, Oscuro, Automático). Se guarda en `localStorage` (si falla, se usa Automático).
- Un script mínimo en el `<head>` aplica `data-theme` antes de dibujar, para que no parpadee. Tailwind pasa de la variante `dark:` por media query a una variante que mira `data-theme` y, en Automático, la preferencia del sistema. Los tokens de `globals.css` se reescriben igual.

### Ícono (RF-20)
- `src/app/icon.svg` = `loader-el-colo.svg` sin la hoja de estilos de animación; `src/app/apple-icon.png` (180 px) y `src/app/favicon.ico` (16, 32 y 48 px) generados desde ese SVG con `rsvg-convert`.

### Tests
- Unidad: `addDays` (sin cambios de resultado), `validateService` con centavos, reloj con desfase (`serverClock`), hook de minutos (RF-16) con tiempo simulado, componente cliente renderizado: días sin lugar sin enlace, cambio de servicio sin navegación.
- Integración: el check de centavos en la base; la foto de la agenda desde la base (sin motivos de bloqueos).
- Velocidad (RNF-3): `tests/e2e/speed.py` con Playwright, 4G lento simulado y CPU 4×; corre contra local y contra producción para la evidencia.
