# Tareas — Spec 001: Agenda, servicios y horarios libres

Estado: aprobado (2026-11-21) · Plan: [`plan.md`](plan.md)

- [ ] **T1. [persona] Crear el proyecto de Supabase y los secretos de GitHub.** RNF-5
  - Hecho cuando: existe el proyecto `barber-colo` (São Paulo); en GitHub existe el entorno `production` (solo `main`, con aprobación obligatoria) y tiene el secreto `SUPABASE_DB_URL`. Evidencia: el *project ref* y una captura del entorno (sin valores).
- [x] **T2. [agente] Kernel compartido: zona, `LocalDate`, minutos, montos y duraciones.** RF-3, RNF-1
  - Hecho cuando: tests en verde con `TZ` de Buenos Aires, UTC y Tokio (`npm run test:tz`), incluidos fin de mes, fin de año y 23:50.
- [ ] **T3. [agente] Dominio de Agenda y Servicios: tipos y validaciones.** RF-12, RF-13, RF-14
  - Hecho cuando: tests de franjas superpuestas, cierre antes de apertura, paso inválido, precio ≤ 0, duración no múltiplo, nombre duplicado y bloqueo vacío en verde.
- [ ] **T4. [agente] Disponibilidad: `bookingWindow`, `dayStarts`, `weekAvailability`, `nextDayWithRoom`.** RF-4 a RF-11, RNF-2
  - Hecho cuando: los 12 casos límite de la spec están como tabla de tests con `now` fijo y pasan en las tres zonas.
- [ ] **T5. [agente] Test de arquitectura.** Constitución, principio 3
  - Hecho cuando: el test pasa con el código actual y falla si se agrega a propósito un import prohibido (se prueba y se revierte).
- [ ] **T6. [agente] Supabase local y migraciones (base, agenda, servicios, configuración inicial) con tests de integración.** RF-12 a RF-14, RNF-5
  - Hecho cuando: `supabase db reset` aplica todo desde cero; los tests de integración de restricciones, RLS y datos iniciales pasan; `supabase db advisors` sin hallazgos de seguridad; `app_server` solo puede leer y `anon` no ve `app` (S-3, S-4).
- [ ] **T7. [agente] Acceso a datos y casos de uso de consulta.** RF-1, RF-2, RF-2b, RF-6b
  - Hecho cuando: tipos generados con `kysely-codegen`; `listServices` y `getAvailability` pasan con repositorios en memoria y contra la base local; la conexión verifica el certificado y un test impide `rejectUnauthorized: false` (S-2).
- [ ] **T8. [agente] Página pública `/` con servicios, semana, día y horarios por franja.** RF-1 a RF-7, RF-2b, RF-6b, RNF-3, RNF-4
  - Hecho cuando: los tests de la página pasan; capturas en 360 px y web, en claro y oscuro, con recorrido por teclado verificado; el detector de impeccable no reporta problemas; un test verifica las cabeceras de seguridad y que los parámetros inválidos caen en los valores por defecto (S-5, S-6).
- [ ] **T9. [agente] CI: job de integración con Supabase y job de migraciones en `main`.** RNF-5
  - Hecho cuando: el PR de la spec muestra el job `integration` en verde y `deploy` espera a ambos; `migrate` corre en el entorno `production` y se saltea con aviso si falta el secreto (S-1).
- [ ] **T10. [persona] Primer despliegue con base real.** RF-1
  - Hecho cuando: el job `migrate` corrió en `main`; `app_server` tiene contraseña y `DATABASE_URL` está en Vercel; la página `/` de producción muestra los tres servicios. Evidencia: captura o URL.
