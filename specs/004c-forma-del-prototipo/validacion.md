# Validación — Spec 004c: La forma del prototipo en las pantallas reales

Fecha: 2026-11-22. Tests unitarios (`SectionNav`, `Segmented`, `InicioClient`) y e2e locales en verde con la forma
nueva: `pestanas.py`, `speed_pestanas.py`, `agenda_fresca.py`, `turnos.py`, `a_cargo.py`, `login.py`, `ajustes.py`,
`booking.py`, `csp.py`, `speed.py`, `speed_login.py`, `speed_cliente.py`. Capturas: `tests/e2e/capturas.py`
(360 y 1440 px, claro y oscuro). Falta T5 (producción).

| RF | Cómo se verifica | Resultado |
|---|---|---|
| RF-1, RF-2 | `SectionNav.test.tsx` (secciones de cada uno, barra y riel); capturas 360 y 1440 | ✅ |
| RF-3 | `pestanas.py` (la marcada es la de la pantalla, con y sin 4G lento); `speed_pestanas.py` | ✅ |
| RF-4 | `SectionNav.test.tsx` (la chapa dice la sección y no es otro `h1`); capturas | ✅ |
| RF-5 a RF-8 | `InicioClient.test.tsx` (casos 1 a 4); `turnos.py` y `a_cargo.py` (chapas por persona, "Reservar turno") | ✅ |
| RF-9 | `Segmented.test.tsx`; `a_cargo.py` (segmentado, quien tiene turno no se elige, con el motivo) | ✅ |
| RF-10 | `turnos.py` y `a_cargo.py` (el resumen dice horario, para quién y precio); capturas (fijo abajo, columna "Tu reserva") | ✅ |
| RF-11 | `turnos.py` (nombre y celular en el resumen, caso del celular de una cuenta) | ✅ |
| RF-12 | `turnos.py` ("Reservaste tu turno" en Inicio); `InicioClient.test.tsx` (mensaje con los datos de Inicio) | ✅ |
| RF-13 | `turnos.py` (Cambiar horario → Reservar → Inicio con "tu turno pasó") | ✅ |
| RF-14 | `turnos.py` (con turno, Reservar lo dice y no muestra horarios) | ✅ |
| RF-15 | `ajustes.py`, `login.py`, `agenda_fresca.py`; capturas de Colo a 1440 | ✅ |
| RNF-1 | Pestañas: vueltas 7–56 ms, primeras ~0,4–0,5 s (4G simulado); reservar 392 ms (redirige desde la acción: un viaje) | ✅ |
| RNF-2 | `aria-current`, navegación "Secciones"; `scroll-padding` para que el foco no quede bajo las barras | ✅ |
| RNF-3 | Capturas: un solo botón rojo por pantalla ("Sí, cancelar" pasa a esmalte), claro y oscuro | ✅ |
| RNF-4 | Todos los e2e de 001 a 004b en verde con los selectores ajustados | ✅ |

## Veredicto

La spec se cumple en local. Pendiente: T5 (desplegar y repetir `pestanas.py`, `turnos.py` y `a_cargo.py` en producción).
