# CI/CD — barber-colo

Nada llega a `main` ni a Vercel sin pasar las mismas pruebas, en tres capas:

| Capa | Cuándo | Qué corre | Dónde está |
|---|---|---|---|
| Hook pre-commit | Cada `git commit` | lint, tipos, tests | `.husky/pre-commit` |
| Hook pre-push | Cada `git push` | `npm run check` (lint, tipos, tests y build) | `.husky/pre-push` |
| GitHub Actions | Cada PR a `main` y cada push a `main` | Job `checks` igual que `npm run check`; job `integration` con Supabase local (migraciones desde cero, tipos al día, tests de integración y `db advisors`); si pasan los dos, job `deploy` | `.github/workflows/ci-cd.yml` |

Los hooks se instalan solos con `npm install` (script `prepare` de husky). Los hooks se pueden saltear con `--no-verify`, por eso la protección real es la de GitHub (paso 3).

## Despliegue

- **Pull request** → si los checks pasan, deploy **preview** en Vercel. La URL aparece en el resumen del job.
- **Merge a `main`** → si los checks pasan, el job `deploy` entra al entorno `production` y **espera tu aprobación**. Aprobado, primero muestra las migraciones pendientes y las aplica a la base de producción (`supabase db push --remote`), y recién después despliega. Si una migración falla, no se despliega.
- En `main` nunca se cancela una corrida en curso (se cancelaría una migración a la mitad); en los PR sí.
- `vercel.json` tiene `git.deploymentEnabled: false`: Vercel no despliega por su cuenta, solo cuando lo ordena el workflow después de los tests.
- Mientras no estén cargados los secretos de Vercel, el job `deploy` se omite con un aviso y el workflow sigue en verde.

## Configuración inicial (se hace una sola vez)

### 1. Crear el proyecto en Vercel (plan Hobby, gratis)

```bash
npm install --global vercel
vercel login
vercel link          # crear un proyecto nuevo llamado barber-colo
cat .vercel/project.json   # muestra orgId y projectId
```

En Vercel → Account Settings → Tokens, crear un token llamado `github-actions`.

### 2. Cargar los secretos en GitHub

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secreto | Valor |
|---|---|
| `VERCEL_TOKEN` | El token del paso 1 |
| `VERCEL_ORG_ID` | `orgId` de `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` de `.vercel/project.json` |

La carpeta `.vercel/` está en `.gitignore`: no se sube.

### 3. Proteger `main`

Repo → Settings → Rules → Rulesets → New branch ruleset:

- Target: `main` (Include default branch).
- ✅ Restrict deletions · ✅ Block force pushes.
- ✅ Require a pull request before merging.
- ✅ Require status checks to pass → agregar **`Lint, tipos, tests y build`** y **`Base de datos e integración`** (aparecen después de la primera corrida del workflow).
- ✅ Require branches to be up to date before merging.

Con esto, ningún cambio entra a `main` (ni se despliega) si algún test falla.

## Más adelante

- Tests end-to-end con Playwright sobre el deploy preview.
- Los deploys preview usan la misma base de producción en modo lectura mientras no haya datos personales; con el login (spec 002) conviene una base aparte para los preview.
