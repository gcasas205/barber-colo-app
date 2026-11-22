# Clarificación — Spec 003: Ajustes de Colo

Revisión como QA del borrador (2026-11-21). Gonzalo aprobó la spec completa con los rangos propuestos
("aplica la spec completa"); las resoluciones se anexan al final y quedan reflejadas en el plan.

## 1. Ambigüedades

1. **RF-14, "en ese día".** Un día cerrado completo no se puede elegir (RF-5 de la 001): no hay un lugar
   donde mostrar el aviso si se lo pone dentro de los horarios del día.
2. **RF-23, formato del WhatsApp.** "Celular argentino" admite varias escrituras; no dice cómo se guarda
   ni cómo se muestra.
3. **RF-25, "siguiente revisión de la página abierta".** RF-16 de la 001 recalcula con la foto que ya
   tiene el navegador: no vuelve a pedir datos, así que un cambio de ajustes no llega a una página abierta.
4. **RF-27, "quién".** No dice si se guarda el usuario de Supabase o un nombre.

## 2. Contradicciones

5. **RF-11 contra RF-10 (bloqueo de días de hoy).** Un bloqueo de días que empieza hoy a las 00:00 empezó
   en el pasado: RF-11 solo pide que no haya terminado, así que se permite (correcto), pero el caso límite 6
   lo confirma solo para el último día.

## 3. Casos límite no cubiertos

6. **Cambio de paso y servicios a la vez.** Si Colo guarda un servicio de 45 min mientras otra pestaña
   cambia el paso a 30, cada validación ve el valor viejo del otro.
7. **Franja que cierra a las 24:00.** No dice si se puede atender hasta la medianoche.
8. **Bloqueo de horas que cruza la medianoche** (de 22 a 02): RF-10 lo limita a un mismo día.
9. **Orden de un servicio reactivado o nuevo** con posiciones salteadas.

## 4. Conflictos con la constitución

10. Ninguno. RF-3 y RNF-3 cumplen el principio 4 (servidor fuente de verdad); RNF-2 el principio 5.

## 5. Impacto en lo que ya está en producción

11. La foto de la agenda (`getScheduleSnapshot`) no lleva el motivo de los bloqueos (S-7 de la 001):
    RF-14 cambia esa decisión para el aviso.
12. `app_server` hoy solo lee la agenda y los servicios: hay que darle escritura (cambio de esquema).

## Resoluciones (2026-11-21)

1. Debajo de la semana se listan los **avisos de los días de esa semana** ("Lun 24 · Cerrado: Vacaciones",
   "Mar 25 · 10:00 a 12:00: Trámite"). Cumple RF-14 aunque el día no se pueda elegir.
2. Se normaliza con la misma regla que el teléfono de la 002 y se guarda como `+549…`; se muestra
   "11 3816-3491".
3. Con la página abierta, el cambio llega al recargar (o al volver a entrar). RF-25 queda: "en la
   siguiente carga". Pedir la foto de nuevo cada minuto queda fuera de alcance.
4. El usuario de Supabase (`auth.users.id`), que identifica a Colo o a Colo demo.
5. Confirmado: un bloqueo se rechaza solo si **terminó**; el que ya empezó y sigue se permite.
6. Los cambios de paso, franjas y servicios se guardan dentro de una transacción que **bloquea la fila de
   ajustes** (`for update`) y vuelve a validar con los valores de ese momento: el segundo espera al primero
   y, si ya no es válido, se rechaza.
7. Sí: una franja puede cerrar a las 24:00 (el dominio ya lo permite).
8. No se permite: se cargan dos bloqueos. El de días cubre noches completas.
9. Las posiciones se reescriben 1, 2, 3… en cada cambio de orden; nuevo o reactivado = máximo + 1.
11. El aviso es un texto **pensado para ser público** (lo escribe Colo para los clientes); la foto lleva
    solo los bloqueos con aviso y su texto. El resto sigue igual que S-7.
12. Aprobado con la spec: escritura sobre `schedule_settings` (update), `weekly_ranges` y
    `schedule_blocks` (insert, delete), `services` (insert, update) y una tabla nueva de auditoría.
