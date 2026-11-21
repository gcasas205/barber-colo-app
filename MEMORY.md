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
- D-11: usuarios de prueba temporales en el mismo entorno (Colo demo + 2 clientes), con botones en el login (spec 002). Se apagan solos al existir el primer cliente real; quitarlos antes del lanzamiento.
- Seguridad 001: sin token de Supabase en GitHub (migraciones con `--db-url` en el entorno `production`), TLS verificado, `app_server` con permisos mínimos, cabeceras CSP/HSTS.
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
- En los tests, ICU puede devolver la zona como `America/Buenos_Aires`: compará el desfase (180 min), no el nombre.
- TypeScript 7 rompe el lint: typescript-eslint (vía eslint-config-next) todavía no lo soporta. Dependabot ignora los majors de `typescript` y `@types/node`.

## Próximos pasos
1. Diseño cerrado y en `main` (`docs/diseno/`, `DESIGN.md`, prototipo `/prototipo`, componentes `src/ui/`).
2. Spec 001 (rama `spec/001-agenda-disponibilidad`): spec, plan y tareas aprobados. Hecho: T1 (Supabase ref `wzuteatyxtnivriuscei`, entorno `production` con `SUPABASE_DB_URL`), T2 (kernel en `src/shared/kernel`), T3 (validaciones), T4 (disponibilidad en `src/modules/schedule/domain/availability.ts`). T5 (test de arquitectura). T6 (migraciones en `supabase/migrations`, tests en `tests/integration`). T7 (Kysely + pg con TLS verificado, repositorios, casos de uso, `src/server/composition.ts`). T8 (página `/` en `src/app/page.tsx` + `src/app/_reservar/`, capturas en `docs/diseno/assets/spec-001-*`). Sigue T9 (CI con Supabase + migrate). Pendiente para la 002: revisar la CSP con nonce (hoy fija con 'unsafe-inline'). Decisiones: sin pantallas de Colo (pasan a 002), página pública sin login, franjas provisorias L-S 10–13 y 14–20, feriados se bloquean a mano.
