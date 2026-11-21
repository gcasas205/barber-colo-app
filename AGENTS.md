# AGENTS.md — barber-colo

App web instalable (PWA) para que los clientes de un barbero reserven, confirmen y cancelen turnos sin WhatsApp, y para que el barbero gestione su agenda, las faltas y los beneficios.

## Antes de tocar nada
- Leé `docs/constitution.md`, `MEMORY.md` y la spec activa (`specs/NNN-*/`).
- El análisis del producto (reglas RN-x, requisitos RF-x y RNF-x) está en `docs/analisis.md`.
- Trabajamos con Spec-Driven Development: skill `sdd` y comandos `/sdd-*`.

## Stack y estructura
- Next.js (App Router) + TypeScript estricto + Tailwind v4. Supabase (Postgres, Auth Google, Cron). Vercel.
- `src/app/`: rutas e interfaz. `src/ui/`: componentes de presentación. `src/modules/<módulo>/`: `domain/` (lógica pura con sus tests), `application/`, `infrastructure/` e `index.ts` (API pública). `src/shared/kernel/`: fechas, montos y `Result`. `src/server/`: arma los casos de uso. `tests/`: arquitectura, integración y tests generales.
- `tests/architecture.test.ts` hace fallar el build si se rompen las capas o se importa otro módulo sin pasar por su `index.ts`.
- `specs/NNN-nombre/`: spec.md, plan.md y tasks.md de cada funcionalidad.

## Comandos
- `npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`
- `npm run check`: todo junto. Es lo mismo que corre el hook pre-push y GitHub Actions.

## Reglas de dominio (fácil equivocarse)
- Fechas: siempre en `America/Argentina/Buenos_Aires` (skill `fechas-locales`). Nada de `toISOString()` para obtener un día.
- Montos en centavos enteros. El precio base se congela al reservar; los descuentos se calculan al marcar Asistió.
- Faltas: solo las **seguidas**; vuelven a cero con una asistencia. La cancelación tarde solo se registra.

## Forma de trabajar
- Una tarea de `tasks.md` por vez: tests primero (en rojo), después el código, `npm run check` en verde.
- Cambios pequeños, una rama por spec (`spec/NNN-nombre`) y PR a `main`.
- Al terminar, resumí qué cambió y actualizá `MEMORY.md`.

## Límites
- ✅ Siempre: respetar la constitución, textos de interfaz en español, actualizar `MEMORY.md`.
- ⚠️ Preguntá antes: dependencias nuevas, cambios de esquema en la base, cambios en `.github/` o en `vercel.json`.
- 🚫 Nunca: leer o escribir `.env*` con secretos reales, desactivar hooks o checks (`--no-verify`), hacer push directo a `main`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
