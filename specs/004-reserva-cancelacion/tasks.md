# Tareas — Spec 004: Reservar, cancelar y reprogramar

Estado: aprobado (2026-11-22) · Plan: [`plan.md`](plan.md)

- [ ] **T1. [agente] Dominio de Turnos y de Agenda (choques).** RF-8, RF-14 a RF-19, RF-24, RF-25, RF-27
  - Hecho cuando: tests de los casos 2 a 8 y 14 en las tres zonas.
- [ ] **T2. [agente] Migración de turnos, historial, agenda vista y limpieza.** RF-12, RF-29, RF-31, RNF-2, RNF-3
  - Hecho cuando: `db reset`, `db:types`, advisors limpios y tests de grants y de la exclusión.
- [ ] **T3. [agente] Identidad y Clientes: invitado de un toque y datos al reservar.** RF-4, RF-5, RF-7, RF-11
  - Hecho cuando: tests de `resolveActor`, `enterAsGuest` y `saveContact` (casos 12).
- [ ] **T4. [agente] Casos de uso y repositorio de Turnos, foto con turnos.** RF-8 a RF-25, RF-28 a RF-30
  - Hecho cuando: tests en memoria y de integración (casos 1, 9, 10, 13, 15).
- [ ] **T5. [agente] Choques con Ajustes.** RF-27
  - Hecho cuando: tests en memoria e integración (caso 11).
- [ ] **T6. [agente] Ingreso como principal y pantalla de turnos.** RF-1 a RF-20, RNF-1, RNF-5
  - Hecho cuando: tests de componentes, cabeceras y capturas en 360 px.
- [ ] **T7. [agente] Agenda de Colo.** RF-21 a RF-26
  - Hecho cuando: tests de componentes y capturas.
- [ ] **T8. [agente] e2e, velocidad y validación.** Criterios de finalización
  - Hecho cuando: `tests/e2e/turnos.py` y los e2e anteriores en verde en local; validación RF por RF.
- [ ] **T9. [persona] Despliegue y verificación en producción.**
  - Hecho cuando: Gonzalo aprueba el deploy y el e2e pasa en producción.
