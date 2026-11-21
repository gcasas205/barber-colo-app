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
- En los tests, ICU puede devolver la zona como `America/Buenos_Aires`: compará el desfase (180 min), no el nombre.
- Vercel crea las funciones en `iad1` (Washington) si no se configura: siempre `regions` al lado de la base.
- `gh` con GraphQL no anda en esta sesión: usar `env -u GH_TOKEN gh api repos/...` (REST) para PRs y checks.
- TypeScript 7 rompe el lint: typescript-eslint (vía eslint-config-next) todavía no lo soporta. Dependabot ignora los majors de `typescript` y `@types/node`.

## Próximos pasos
1. Diseño cerrado y en `main` (`docs/diseno/`, `DESIGN.md`, prototipo `/prototipo`, componentes `src/ui/`).
2. **Spec 001 implementada** (PR #10 y #11, en producción en barber-colo.vercel.app). Página pública que calcula en el dispositivo con la foto de la agenda; Supabase ref `wzuteatyxtnivriuscei`; funciones en `gru1`; e2e y velocidad en `tests/e2e/*.py` (producción: carga 1,2 s desde EE. UU., cambios ~100 ms). Franjas 10–13 y 14–20 siguen provisorias.
3. **Spec 002 (`login-perfil`) aprobada con plan y tareas; cambio 01 = sin Google (D-17)**: ingreso como Corralap (correo + contraseña, lista de cuentas de prueba que completa el formulario) + invitado. Google y BARBER_EMAIL → spec `publicacion`. Sigue T1 [persona] y T2. (rama `spec/002-login-perfil`): Google, invitado (D-12), Colo por email en variable de entorno (D-13), sobrenombre solo para Colo (D-14), usuarios de prueba (D-11; Colo demo cambia todo, D-15; **no se apagan solos**: los apaga Gonzalo al publicar). D-16: hosting definitivo fuera de Vercel, a elegir al publicar; no depender de Vercel. Backlog renumerado: 003 = ajustes de Colo, 004 = reserva. Revisar ahí la CSP con nonce (hoy fija con 'unsafe-inline').
