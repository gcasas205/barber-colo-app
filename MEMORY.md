# MEMORY.md — barber-colo

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resumí o eliminá lo que ya no aporte.

## Estado actual
- Análisis aprobado (`docs/analisis.md`) y constitución aprobada (`docs/constitution.md`).
- Base del repo: Next.js 16 + Tailwind + Vitest, hooks de husky y CI/CD en GitHub Actions con deploy a Vercel. Repo `gcasas205/barber-colo-app`, `main` protegida.
- Camino acordado: Análisis → Diseño → Implementación (specs SDD con TDD) → Tests de integración/e2e → App terminada.
- Análisis extendido aprobado: `docs/dominio.md`, `docs/casos-de-uso.md`, `docs/secuencias.md` y `docs/estadisticas-crm.md`, con las decisiones P-04 a P-15, inspirado en Corralap (`EloSanz/crm-web-app`).

## Decisiones (y por qué)
- Supabase Cron para las tareas cada minuto: la ventana de confirmación es de 30 min y el cron gratis de Vercel no alcanza.
- Vercel no despliega solo (`vercel.json`): despliega GitHub Actions después de que pasan los checks.
- Fuentes del sistema en lugar de `next/font/google`: el build no depende de la red.
- `npm run typecheck` corre `next typegen` antes de `tsc` para generar los tipos de rutas (`LayoutProps`, `PageProps`).

## Aprendizajes y errores a evitar
- Skills de terceros en `.claude/skills` (impeccable, vercel-react-best-practices, supabase, supabase-postgres-best-practices; lock en `skills-lock.json`): excluidas de ESLint. La skill next-best-practices no existe: usar `node_modules/next/dist/docs/`.
- De Corralap: no cargar todos los datos en memoria para métricas (calcular en Postgres) y agrupar días en hora local, no UTC.
- En los tests, ICU puede devolver la zona como `America/Buenos_Aires`: compará el desfase (180 min), no el nombre.
- TypeScript 7 rompe el lint: typescript-eslint (vía eslint-config-next) todavía no lo soporta. Dependabot ignora los majors de `typescript` y `@types/node`.

## Próximos pasos
1. Diseño (rama `design/arquitectura`): 1) arquitectura aprobada (`docs/diseno/01-arquitectura.md`), 2) base de datos en revisión (`docs/diseno/02-base-de-datos.md`), 3) backend, 4) interfaz con impeccable.
2. Spec 001: agenda y disponibilidad.
