---
name: fechas-locales
description: Usala siempre que escribas, modifiques o revises código que trabaje con fechas, horas, plazos, días de la semana, meses o tareas programadas en barber-colo (turnos, recordatorios, confirmaciones, cancelaciones, faltas o beneficios del mes).
---

# Fechas y horas en barber-colo

Las fechas son la mayor fuente de bugs de este proyecto: un turno a las 22:30 de Buenos Aires ya es "mañana" en UTC.

## Reglas
- La zona del negocio es `America/Argentina/Buenos_Aires` (UTC-3, sin horario de verano hoy, pero no lo asumas en el código: usá la librería de zonas horarias que elija el plan).
- En la base, los instantes se guardan como `timestamptz`. Los días del calendario del local ("el 4.º corte del mes", "el día anterior") se calculan **en la zona del local**, nunca en UTC.
- Las funciones de `src/domain` reciben `now` como parámetro. Nunca llaman a `new Date()` ni a `Date.now()` adentro.
- Nunca uses `toISOString().slice(0, 10)` para obtener un día ni `new Date("AAAA-MM-DD")` para leerlo: se interpretan en UTC.
- Para sumar días o cambiar de mes, usá la librería, nunca milisegundos (`86400000`).
- Los plazos del negocio se expresan como duraciones con nombre (`CANCEL_WINDOW`, `CONFIRMATION_LEAD`, `CONFIRMATION_WINDOW`, `UNDO_WINDOW`) y salen de la configuración del barbero, no de números sueltos.
- Los límites se definen una sola vez: "hasta 4 h antes" significa que a exactamente 4 h **todavía** se puede cancelar sin registro. Escribí el test del borde exacto.

## Checklist de revisión
- [ ] ¿Algún `new Date()` o `Date.now()` dentro de `src/domain`?
- [ ] ¿Algún `toISOString()` o `new Date("AAAA-MM-DD")` para obtener o leer un día?
- [ ] ¿Algún cálculo con `86400000` o `3600000` para cambiar de día?
- [ ] ¿Qué pasa con un turno a las 23:30 o a las 00:00?
- [ ] ¿Qué pasa con un turno del 1.º del mes reservado el último día del mes anterior?
- [ ] ¿Qué pasa exactamente en el borde de cada plazo (4 h, 1 h, 30 min, 10 min)?
- [ ] ¿Qué pasa con una reserva hecha después de la hora del recordatorio del día anterior?
- [ ] ¿Los tests fijan `now` con una fecha concreta en vez de depender del reloj?

## Al terminar
Indicá qué puntos del checklist comprobaste y con qué test.
