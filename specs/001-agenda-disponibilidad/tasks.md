# Tareas — Spec 001: Agenda, servicios y horarios libres

Estado: aprobado (2026-11-21) · Plan: [`plan.md`](plan.md)

- [x] **T1. [persona] Crear el proyecto de Supabase y los secretos de GitHub.** RNF-5
  - Hecho cuando: existe el proyecto `barber-colo` (São Paulo); en GitHub existe el entorno `production` (solo `main`, con aprobación obligatoria) y tiene el secreto `SUPABASE_DB_URL`. Evidencia: el *project ref* y una captura del entorno (sin valores).
- [x] **T2. [agente] Kernel compartido: zona, `LocalDate`, minutos, montos y duraciones.** RF-3, RNF-1
  - Hecho cuando: tests en verde con `TZ` de Buenos Aires, UTC y Tokio (`npm run test:tz`), incluidos fin de mes, fin de año y 23:50.
- [x] **T3. [agente] Dominio de Agenda y Servicios: tipos y validaciones.** RF-12, RF-13, RF-14
  - Hecho cuando: tests de franjas superpuestas, cierre antes de apertura, paso inválido, precio ≤ 0, duración no múltiplo, nombre duplicado y bloqueo vacío en verde.
- [x] **T4. [agente] Disponibilidad: `bookingWindow`, `dayStarts`, `weekAvailability`, `nextDayWithRoom`.** RF-4 a RF-11, RNF-2
  - Hecho cuando: los 12 casos límite de la spec están como tabla de tests con `now` fijo y pasan en las tres zonas.
- [x] **T5. [agente] Test de arquitectura.** Constitución, principio 3
  - Hecho cuando: el test pasa con el código actual y falla si se agrega a propósito un import prohibido (se prueba y se revierte).
- [x] **T6. [agente] Supabase local y migraciones (base, agenda, servicios, configuración inicial) con tests de integración.** RF-12 a RF-14, RNF-5
  - Hecho cuando: `supabase db reset` aplica todo desde cero; los tests de integración de restricciones, RLS y datos iniciales pasan; `supabase db advisors` sin hallazgos de seguridad; `app_server` solo puede leer y `anon` no ve `app` (S-3, S-4).
- [x] **T7. [agente] Acceso a datos y casos de uso de consulta.** RF-1, RF-2, RF-2b, RF-6b
  - Hecho cuando: tipos generados con `kysely-codegen`; `listServices` y `getAvailability` pasan con repositorios en memoria y contra la base local; la conexión verifica el certificado y un test impide `rejectUnauthorized: false` (S-2).
- [x] **T8. [agente] Página pública `/` con servicios, semana, día y horarios por franja.** RF-1 a RF-7, RF-2b, RF-6b, RNF-3, RNF-4
  - Hecho cuando: los tests de la página pasan; capturas en 360 px y web, en claro y oscuro, con recorrido por teclado verificado; el detector de impeccable no reporta problemas; un test verifica las cabeceras de seguridad y que los parámetros inválidos caen en los valores por defecto (S-5, S-6).
- [x] **T9. [agente] CI: job de integración con Supabase y migraciones antes del deploy en `main`.** RNF-5
  - Hecho cuando: el PR de la spec muestra el job `integration` en verde y `deploy` espera a ambos; las migraciones corren en el entorno `production` antes del deploy y se saltean con aviso si falta el secreto (S-1).
- [ ] **T10. [persona] Primer despliegue con base real.** RF-1
  - Hecho cuando: el job `migrate` corrió en `main`; `app_server` tiene contraseña y `DATABASE_URL` está en Vercel; la página `/` de producción muestra los tres servicios. Evidencia: captura o URL.


## Cambio 01

- [x] **T11. [agente] Kernel y servicios: `addDays` con `Date.UTC` y precios sin centavos (dominio + migración).** RF-3, RF-13, constitución 6
  - Hecho cuando: tests de fechas sin cambios en verde en las tres zonas; `validateService` y la base rechazan centavos.
- [x] **T12. [agente] Foto de la agenda y reloj del servidor.** RF-15, RF-16, caso 14, S-7
  - Hecho cuando: el caso de uso devuelve todo lo necesario para el mes en una consulta por tabla, sin motivos de bloqueos; `serverClock` corrige el desfase del dispositivo (tests).
- [x] **T13. [agente] Página con cálculo en el dispositivo: dirección fija, días sin lugar no elegibles, refresco cada minuto y loader en las esperas.** RF-4, RF-5, RF-15, RF-16, RF-19
  - Hecho cuando: tests del componente en verde; en el navegador, elegir servicio, día o semana no cambia la dirección ni pide nada al servidor.
- [x] **T14. [agente] Tema claro/oscuro/automático, pie con WhatsApp e Instagram e ícono de la app.** RF-17, RF-18, RF-20
  - Hecho cuando: el tema elegido se recuerda y abre sin parpadeo (captura); el detector de impeccable sin hallazgos en los tres temas; el ícono aparece en la pestaña.
- [x] **T15. [agente] Región São Paulo y test de velocidad.** RNF-3
  - Hecho cuando: `vercel.json` con `gru1`; el test de velocidad local da < 2 s la carga y < 200 ms los cambios.
- [x] **T16. [persona] Verificación en producción.** RNF-3, RF-15, RF-17
  - Hecho cuando: después del deploy, el test de velocidad contra producción cumple RNF-3 y Gonzalo confirma en su celular que se siente rápida y que el tema se recuerda.
