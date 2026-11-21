# Clarificación — Spec 001 (revisión QA, solo detecta)

1. **Ambigüedad (RF-7):** "mañana = antes de las 14:00" depende de las franjas provisorias. Si Colo cambia el corte del mediodía, el agrupamiento puede quedar raro (por ejemplo, un turno de 13:30 en "mañana" con un corte a las 15:00).
2. **Ambigüedad (RF-4):** la ventana de reserva tiene 31 días. No se dice cómo se recorren en el celular (¿una tira de 31 días?, ¿de a semanas?).
3. **Caso límite no cubierto (RF-6):** si ningún día de la ventana tiene lugar para el servicio, no se dice qué ve el visitante.
4. **Caso límite no cubierto (RF-1):** qué ve el visitante si no hay ningún servicio activo.
5. **Caso límite no cubierto (RF-12/RF-13):** si cambia el paso de la agenda y una duración existente deja de ser múltiplo (por ejemplo, paso de 20 con un servicio de 30 min), no se dice qué pasa con ese servicio.
6. **Posible contradicción con el análisis (RN-04):** el análisis habla de "no más de 30 días de anticipación"; la spec lo define como días calendario (hoy + 30, ambos incluidos). Son dos lecturas distintas en el borde.
7. **Conflictos con la constitución:** ninguno detectado.

## Resoluciones (aprobadas por el dueño, 2026-11-21)

1. Agrupar los horarios por franja, no por hora fija.
2. Días de a una semana, con flechas para la anterior y la siguiente.
3. Sin lugar en los 30 días → mensaje y enlace a WhatsApp.
4. Sin servicios activos → "Por ahora no hay turnos online" y enlace a WhatsApp.
5. Cambio de paso incompatible con una duración → no se permite y se avisa; se implementa en la spec 002.
6. Ventana en días calendario: hoy y los 30 siguientes.
