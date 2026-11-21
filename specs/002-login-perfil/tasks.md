# Tareas — Spec 002: Login y perfil

Estado: borrador (pendiente de aprobación) · Plan: [`plan.md`](plan.md)

- [ ] **T1. [persona] Google OAuth, Auth de Supabase y variables de entorno.** RF-2, RF-6, RF-15, RF-22
  - Hecho cuando: Google y el ingreso anónimo están activos en Supabase, las direcciones permitidas están
    cargadas y las 5 variables están en Vercel. Evidencia: captura de los proveedores (sin secretos) y la
    lista de nombres de variables.
- [ ] **T2. [agente] Dominio de clientes: teléfono, nombre, cumpleaños y reglas del teléfono.** RF-9 a RF-12, RF-16, RF-17
  - Hecho cuando: tests en verde en las tres zonas (más de 20 formatos de teléfono y todas las salidas de `phone-claim`).
- [ ] **T3. [agente] Migraciones de clientes e identidad, con retención y permisos.** RF-4, RF-14, RF-17, RF-18b, RF-25, RNF-3
  - Hecho cuando: `supabase db reset` aplica todo; los tests de integración de restricciones, permisos y
    marca de prueba pasan; `db advisors` sin hallazgos.
- [ ] **T4. [agente] Identidad: `getActor()`, rol por email verificado, inactividad, demo y `proxy.ts`.** RF-4 a RF-8, RF-24
  - Hecho cuando: tests de `actor.ts` (email no verificado, mayúsculas, email cambiado, demo apagada,
    61 días sin uso) y de integración con sesiones reales de la base local.
- [ ] **T5. [agente] Casos de uso: perfil con unión de invitados, invitado con límite, demo, lista y sobrenombre.** RF-2, RF-9 a RF-25
  - Hecho cuando: tests con repositorios en memoria y de integración (dos clientes, unión con turnos
    futuros simulados, sexto intento, borrado de la demo con datos reales al lado).
- [ ] **T6. [agente] Pantallas de ingreso, vuelta de Google, perfil, cuenta del invitado y franja de prueba.** RF-1 a RF-5, RF-9 a RF-18b, RF-22b
  - Hecho cuando: tests de los componentes; capturas en 360 px y web, claro y oscuro; detector de impeccable sin hallazgos.
- [ ] **T7. [agente] Pantalla de Colo: lista, sobrenombre y salir de todos los dispositivos.** RF-5b, RF-19 a RF-21
  - Hecho cuando: tests y capturas; un cliente que abre `/colo` ve RF-8.
- [ ] **T8. [agente] Seguridad del navegador: CSP con nonce en las pantallas con sesión y hash del script del tema.** RNF-4
  - Hecho cuando: test de cabeceras por ruta; e2e sin errores de CSP; la página pública sigue prerenderizada.
- [ ] **T9. [agente] Pruebas de punta a punta, velocidad y comando de borrado de la demo.** RF-25, RNF-6
  - Hecho cuando: `tests/e2e/login.py` y `speed.py` en verde en local; `npm run demo:purge` probado
    contra la base local con datos reales al lado.
- [ ] **T10. [persona] Verificación en Vercel.** Criterios de finalización
  - Hecho cuando: Gonzalo entra con Google, como invitado y con las tres demos; con su email como
    `BARBER_EMAIL` ve la lista y pone un sobrenombre. Evidencia: capturas.
