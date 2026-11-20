# MEMORY.md — barber-colo

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resumí o eliminá lo que ya no aporte.

## Estado actual
- Análisis aprobado (`docs/analisis.md`) y constitución aprobada (`docs/constitution.md`).
- Base del repo: Next.js 16 + Tailwind + Vitest, hooks de husky y CI/CD en GitHub Actions con deploy a Vercel.
- Camino acordado: Análisis → Diseño → Implementación (specs SDD con TDD) → Tests de integración/e2e → App terminada.
- Análisis extendido en revisión: `docs/dominio.md`, `docs/casos-de-uso.md`, `docs/secuencias.md` (propuestas P-04 a P-09) y `docs/estadisticas-crm.md` (P-10 a P-13), inspirado en Corralap (`EloSanz/crm-web-app`).

## Decisiones (y por qué)
- Supabase Cron para las tareas cada minuto: la ventana de confirmación es de 30 min y el cron gratis de Vercel no alcanza.
- Vercel no despliega solo (`vercel.json`): despliega GitHub Actions después de que pasan los checks.
- Fuentes del sistema en lugar de `next/font/google`: el build no depende de la red.
- `npm run typecheck` corre `next typegen` antes de `tsc` para generar los tipos de rutas (`LayoutProps`, `PageProps`).

## Aprendizajes y errores a evitar
- De Corralap: no cargar todos los datos en memoria para métricas (calcular en Postgres) y agrupar días en hora local, no UTC.
- En los tests, ICU puede devolver la zona como `America/Buenos_Aires`: compará el desfase (180 min), no el nombre.

## Próximos pasos
1. Confirmar P-14 (reprogramación) y P-15 (cumpleaños). P-04 a P-13 aprobadas.
2. Diseño: base de datos, arquitectura de la aplicación y backend, con las skills de front, back e infra.
3. Spec 001: agenda y disponibilidad.
