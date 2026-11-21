# Tareas — Spec 002: Login y perfil

Estado: aprobado (2026-11-21), con el cambio 01 (sin Google) · Plan: [`plan.md`](plan.md)

- [x] **T1. [persona] Auth de Supabase: ingreso anónimo, 3 cuentas de prueba y variables de entorno.** RF-15, RF-22
  - Hecho cuando: el ingreso anónimo está activo, las 3 cuentas de prueba existen (confirmadas) y las 4
    variables están en Vercel. Evidencia: captura de la lista de usuarios y nombres de las variables.
- [x] **T2. [agente] Dominio de clientes: teléfono, nombre, cumpleaños y reglas del teléfono.** RF-9 a RF-12, RF-16, RF-17
  - Hecho cuando: tests en verde en las tres zonas (más de 20 formatos de teléfono y todas las salidas de `phone-claim`).
- [x] **T3. [agente] Migraciones de clientes e identidad, con retención y permisos.** RF-4, RF-14, RF-17, RF-18b, RF-25, RNF-3
  - Hecho cuando: `supabase db reset` aplica todo; los tests de integración de restricciones, permisos y
    marca de prueba pasan; `db advisors` sin hallazgos.
- [x] **T4. [agente] Identidad: `getActor()`, cuentas de prueba, invitado, inactividad y `proxy.ts`.** RF-1b, RF-1c, RF-4, RF-5, RF-8, RF-24
  - Hecho cuando: tests de `actor.ts` (cuenta de correo que no es de prueba, demo apagada, 61 días sin
    uso) y de integración con sesiones reales de la base local.
- [x] **T5. [agente] Casos de uso: perfil con unión de invitados, invitado con límite, demo, lista y sobrenombre.** RF-2, RF-9 a RF-25
  - Hecho cuando: tests con repositorios en memoria y de integración (dos clientes, unión con turnos
    futuros simulados, sexto intento, borrado de la demo con datos reales al lado).
- [x] **T6. [agente] Pantallas de ingreso (como Corralap), perfil, cuenta del invitado y franja de prueba.** RF-1 a RF-1c, RF-4, RF-5, RF-9 a RF-18b, RF-22, RF-22b
  - Hecho cuando: tests de los componentes; capturas en 360 px y web, claro y oscuro; detector de impeccable sin hallazgos.
- [x] **T7. [agente] Pantalla de Colo: lista, sobrenombre y salir de todos los dispositivos.** RF-5b, RF-19 a RF-21
  - Hecho cuando: tests y capturas; un cliente que abre `/colo` ve RF-8.
- [x] **T8. [agente] Seguridad del navegador: CSP con nonce en las pantallas con sesión y hash del script del tema.** RNF-4
  - Hecho cuando: test de cabeceras por ruta; e2e sin errores de CSP; la página pública sigue prerenderizada.
- [x] **T9. [agente] Pruebas de punta a punta, velocidad y comando de borrado de la demo.** RF-25, RNF-6
  - Hecho cuando: `tests/e2e/login.py` y `speed.py` en verde en local; `npm run demo:purge` probado
    contra la base local con datos reales al lado.
- [ ] **T10. [persona] Verificación en Vercel.** Criterios de finalización
  - Hecho cuando: Gonzalo entra con las tres cuentas de prueba y como invitado; como Colo ve la lista y
    pone un sobrenombre; como cliente de prueba completa el perfil. Evidencia: capturas.
