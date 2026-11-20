# barber-colo

Turnos online para la barbería: los clientes reservan, confirman y cancelan desde el celular, y el barbero gestiona su agenda, las faltas y los beneficios. Sin WhatsApp ni libreta.

- Análisis del producto: [`docs/analisis.md`](docs/analisis.md)
- Constitución (principios innegociables): [`docs/constitution.md`](docs/constitution.md)
- CI/CD y despliegue: [`docs/ci-cd.md`](docs/ci-cd.md)
- Specs: [`specs/`](specs/)

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Vercel · Vitest

## Empezar

```bash
nvm use          # Node 22
npm install      # instala dependencias y activa los hooks de git
npm run dev      # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint, sin warnings permitidos |
| `npm run typecheck` | Tipos de rutas + TypeScript estricto |
| `npm test` | Tests con Vitest (zona horaria de Buenos Aires) |
| `npm run build` | Build de producción |
| `npm run check` | Todo lo anterior. Lo corre el pre-push y GitHub Actions |

## Cómo se trabaja (Spec-Driven Development)

Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio.

Con Claude Code:

| Comando | Fase |
|---|---|
| `/sdd-spec 001-nombre idea…` | Especificación |
| `/sdd-clarify 001-nombre` | Clarificación |
| `/sdd-plan 001-nombre` | Plan |
| `/sdd-tasks 001-nombre` | Tareas |
| `/sdd-implement 001-nombre T1` | Implementación (una tarea) |
| `/sdd-validate 001-nombre` | Validación |
| `/sdd-change 001-nombre requisito…` | Cambio de requisitos |
| `/sdd-status 001-nombre` | Dónde estamos |
| `/sdd-run idea…` | Flujo completo con los subagentes planner, implementer y reviewer |

Cada spec se trabaja en su rama (`spec/NNN-nombre`) y entra a `main` por pull request, con los checks en verde.
