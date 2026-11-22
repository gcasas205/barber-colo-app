# MEMORY.md — barber-colo

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resumí o eliminá lo que ya no aporte.

## Estado actual
- Análisis aprobado (`docs/analisis.md`) y constitución aprobada (`docs/constitution.md`).
- Base del repo: Next.js 16 + Tailwind + Vitest, hooks de husky y CI/CD en GitHub Actions con deploy a Vercel. Repo `gcasas205/barber-colo-app`, `main` protegida.
- Camino acordado: Análisis → Diseño → Implementación (specs SDD con TDD) → Tests de integración/e2e → App terminada.
- Análisis extendido aprobado: `docs/dominio.md`, `docs/casos-de-uso.md`, `docs/secuencias.md` y `docs/estadisticas-crm.md`, con las decisiones P-04 a P-15, inspirado en Corralap (`EloSanz/crm-web-app`).

## Decisiones (y por qué)
- D-10: servicios Corte $18.000, Completo (corte, barba y cejas) $20.000, Claritos $70.000, con duración propia; agenda con paso de 15 min; beneficios solo Corte y Completo; ceras = producto, fuera. P-17 aprobada (cambiar servicio al marcar asistencia, precio del servicio nuevo). Duraciones: Corte 30, Completo 30, Claritos 120 (editables en Ajustes → Servicios).
- P-16: titular + hasta 5 personas a cargo (hijos); cada persona es un cliente con su historial; notificaciones al titular.
- D-11: usuarios de prueba temporales en el mismo entorno (Colo demo + 2 clientes), con botones en el login (spec 002). No se apagan solos: Gonzalo avisa cuando se publica y se desactivan a mano (+ `demo:purge`).
- Seguridad 001: sin token de Supabase en GitHub (migraciones con `supabase db push --remote=<url>` dentro del job deploy, entorno `production` con aprobación), TLS verificado, `app_server` con permisos mínimos, cabeceras CSP/HSTS.
- Supabase Cron para las tareas cada minuto: la ventana de confirmación es de 30 min y el cron gratis de Vercel no alcanza.
- Vercel no despliega solo (`vercel.json`): despliega GitHub Actions después de que pasan los checks.
- Fuentes del sistema en lugar de `next/font/google`: el build no depende de la red.
- `npm run typecheck` corre `next typegen` antes de `tsc` para generar los tipos de rutas (`LayoutProps`, `PageProps`).

## Aprendizajes y errores a evitar
- UI: seguir `DESIGN.md` (tres voces de color, un solo botón rojo por pantalla, estados con ícono y palabra, poste solo en carga/confirmación/Ahora). Al levantar `next start` para capturas, matar antes el puerto (`fuser -k`), o se sirve un build viejo.
- Skills de terceros en `.claude/skills` (impeccable, vercel-react-best-practices, supabase, supabase-postgres-best-practices; lock en `skills-lock.json`): excluidas de ESLint. La skill next-best-practices no existe: usar `node_modules/next/dist/docs/`.
- De Corralap: no cargar todos los datos en memoria para métricas (calcular en Postgres) y agrupar días en hora local, no UTC.
- `npm test` corre la suite y además `test:tz` (src/ con TEST_TZ=UTC y Asia/Tokyo). Para días, usar `LocalDate` del kernel, nunca `Date`.
- Base local: `npm run db:start` (puerto 54332, no el 54322 por defecto) y `npm run test:integration`. En este entorno cloud hay que levantar `dockerd` antes. Nada de tipos de rango propios: `db advisors` marca sus constructores y no se pueden modificar.
- En un `check` de Postgres, una comparación con `null` da desconocido y **pasa**: exigir `is not null` explícito. `seed.sql` solo corre con `supabase db reset`, no con `start`.
- Teléfono único entre no vinculados: para deshacer una unión o borrar, primero sacar el teléfono o borrar el vinculado (si no, choca el índice). Los clientes de prueba conservan "(demo)" al editar el nombre.
- `@supabase/ssr` crea cookies legibles por JS por defecto: pasar `cookieOptions` con httpOnly (servidor y proxy). Next agrega un `role=alert` propio (anunciador de rutas): en e2e usar `main [role=alert]`.
- CSP con nonce + Cache Components: la ruta tiene que ser bloqueante (`export const instant = false`), si no el build falla. Para probar la CSP, inyectar HTML (`onerror`), no `createElement` desde Playwright (strict-dynamic lo deja pasar).
- Pantallas bloqueantes (`instant = false`) sin `<Suspense>`: el fallback agrega la demora de React al reemplazarlo (~300 ms+). Next deja ocultas las pantallas anteriores: en e2e, selectores con `:visible`. Los tests de integración dejan a `app_server` con la contraseña `local-test-only` (usar la misma en la app local).
- En los tests, ICU puede devolver la zona como `America/Buenos_Aires`: compará el desfase (180 min), no el nombre.
- Vercel crea las funciones en `iad1` (Washington) si no se configura: siempre `regions` al lado de la base. **Verificar la región de Supabase, no suponerla** (la primera base quedó en us-east-1 y cada pedido cruzaba el continente: 1,9 s → 0,75 s al mudarla a sa-east-1). Proyecto nuevo = correr también el `alter role app_server` (si no, EAUTHQUERY en el pooler).
- Un error de Postgres (23505, 23P01) aborta la transacción y Kysely no la confirma: usar `guarded()` (savepoint) de `src/shared/db/guarded.ts`.
- Pantallas 100% dinámicas: con `partialPrefetching` los enlaces precargan solo la parte fija, sin datos. Para que se sienta rápido: cambiar dentro de la pantalla con una acción del servidor y precargar los vecinos (agenda), y respuesta inmediata con `useLinkStatus` (pestañas). Precargar nunca puede tener efectos (por eso `markAgendaSeen` va aparte). Next guarda las pantallas visitadas (Activity) y las vuelve a mostrar con su estado: nada de estado "optimista" que dependa de la navegación (usar `useLinkStatus` y limpiar al ocultarse).
- e2e: `has-text` no distingue mayúsculas y busca por partes ("Tu turno" encuentra "Reservá tu turno"): usar `text-is`. Con 4G lento, esperar la hidratación antes de tocar botones que completan formularios.
- `gh` con GraphQL no anda en esta sesión: usar `env -u GH_TOKEN gh api repos/...` (REST) para PRs y checks.
- TypeScript 7 rompe el lint: typescript-eslint (vía eslint-config-next) todavía no lo soporta. Dependabot ignora los majors de `typescript` y `@types/node`.

## Próximos pasos
1. Diseño cerrado y en `main` (`docs/diseno/`, `DESIGN.md`, prototipo `/prototipo`, componentes `src/ui/`).
2. **Spec 001 implementada** (PR #10 y #11, en producción en barber-colo.vercel.app). Página pública que calcula en el dispositivo con la foto de la agenda; Supabase ref `ohfedpyxtowaeaafemkb` (sa-east-1, desde 2026-11-21); funciones en `gru1`; e2e y velocidad en `tests/e2e/*.py` (producción: carga 1,2 s desde EE. UU., cambios ~100 ms). Franjas 10–13 y 14–20 siguen provisorias.
3. **Spec 002 implementada** (PR #13 y el de cierre): ingreso como Corralap con cuentas de prueba (D-11, D-15, **no se apagan solas**), invitado (D-12), `/perfil`, `/colo` con sobrenombres (D-14), CSP con nonce en las rutas con sesión, `getActor()` = única lectura de sesión (con `readClaims`: si getClaims lanza, es "sin sesión"). Producción desde Buenos Aires: entrar 0,75 s, pantallas con sesión ~0,15 s. Google, BARBER_EMAIL, apagar la demo y hosting (D-16, no depender de Vercel) → spec `publicacion`.
4. **Spec 003 (`ajustes-colo`) implementada** (PR #16 y #17, en producción; e2e `tests/e2e/ajustes.py <URL>`). `/colo/ajustes`: franjas (copiar días), paso, bloqueos de días u horas con aviso público (`notice`, en la foto como `notices`), servicios (orden, sacar, reactivar), anticipación, días a futuro y WhatsApp. Casos de uso con transacción que bloquea la fila de ajustes (`src/server/settings.ts`); auditoría en `app.settings_changes`. La demo cambia la agenda real (D-15).
5. **Spec 004 (`reserva-cancelacion`) implementada en local** (rama `spec/004-reserva-cancelacion`; falta T9). D-18: `/` = ingreso; `/turnos` = horarios + reservar + "Tu turno"; `/colo` = agenda del día (Clientes en `/colo/clientes`). Módulo `appointments` (exclusión en la base, transacciones con `for share` de ajustes y `for update` del cliente, historial en `appointment_events`). Invitado de un toque; nombre y celular al reservar (`saveContact`). Siguiente: 004b (personas a cargo).
