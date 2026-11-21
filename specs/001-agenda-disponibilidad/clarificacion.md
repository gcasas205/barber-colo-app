# Clarificación — Spec 001 (revisión QA, solo detecta)

1. **Ambigüedad (RF-7):** "mañana = antes de las 14:00" depende de las franjas provisorias. Si Colo cambia el corte del mediodía, el agrupamiento puede quedar raro (por ejemplo, un turno de 13:30 en "mañana" con un corte a las 15:00).
2. **Ambigüedad (RF-4):** la ventana de reserva tiene 31 días. No se dice cómo se recorren en el celular (¿una tira de 31 días?, ¿de a semanas?).
3. **Caso límite no cubierto (RF-6):** si ningún día de la ventana tiene lugar para el servicio, no se dice qué ve el visitante.
4. **Caso límite no cubierto (RF-1):** qué ve el visitante si no hay ningún servicio activo.
5. **Caso límite no cubierto (RF-12/RF-13):** si cambia el paso de la agenda y una duración existente deja de ser múltiplo (por ejemplo, paso de 20 con un servicio de 30 min), no se dice qué pasa con ese servicio.
6. **Posible contradicción con el análisis (RN-04):** el análisis habla de "no más de 30 días de anticipación"; la spec lo define como días calendario (hoy + 30, ambos incluidos). Son dos lecturas distintas en el borde.
7. **Conflictos con la constitución:** ninguno detectado.
