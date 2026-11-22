# Tareas — Spec 003: Ajustes de Colo

Estado: aprobado (2026-11-21) · Plan: [`plan.md`](plan.md)

- [x] **T1. [agente] Dominio de Agenda: franjas, paso, reglas de reserva, bloqueos, avisos y WhatsApp.** RF-6, RF-7, RF-9, RF-11, RF-14, RF-22 a RF-24
  - Hecho cuando: tests de los casos límite 1 a 8 y 12 a 14 en verde en las tres zonas.
- [x] **T2. [agente] Dominio de Precios: validación ampliada y orden.** RF-17, RF-18, RF-20
  - Hecho cuando: tests de los casos 9 y 10 y de los rangos de precio y duración.
- [ ] **T3. [agente] Migración de escritura y auditoría.** RF-27, RNF-1
  - Hecho cuando: `supabase db reset` aplica todo, `db:types` actualizado y tests de integración de grants.
- [ ] **T4. [agente] Casos de uso, repositorios y armado con transacción.** RF-2, RF-3, RF-5, RF-8 a RF-13, RF-15 a RF-24, RF-27, RF-28
  - Hecho cuando: tests con repositorios en memoria y de integración (caso 16, índice de nombres).
- [ ] **T5. [agente] Avisos de bloqueo en la página pública.** RF-14, RF-25
  - Hecho cuando: test del componente y de la foto con aviso.
- [ ] **T6. [agente] Pantalla de Ajustes: horarios, paso, reserva y contacto.** RF-1, RF-2, RF-4 a RF-9, RF-22 a RF-26
  - Hecho cuando: tests de componentes y capturas en 360 px y web.
- [ ] **T7. [agente] Pantalla de Ajustes: bloqueos y servicios.** RF-10 a RF-21
  - Hecho cuando: tests de componentes y capturas.
- [ ] **T8. [agente] e2e, velocidad y validación de la spec.** Criterios de finalización, RNF-5
  - Hecho cuando: `tests/e2e/ajustes.py` en verde en local; validación RF por RF.
- [ ] **T9. [persona] Despliegue y verificación en producción.** Criterios de finalización
  - Hecho cuando: Gonzalo aprueba el deploy (migración) y el e2e pasa en producción; franjas definitivas cargadas.
