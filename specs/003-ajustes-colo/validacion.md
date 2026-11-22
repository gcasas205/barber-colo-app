# Validación — Spec 003: Ajustes de Colo

Fecha: 2026-11-21. Recorrido RF por RF contra los tests (en verde) y el e2e local `tests/e2e/ajustes.py`.
Falta la verificación en producción (T9).

| RF | Cómo se verifica | Resultado |
|---|---|---|
| RF-1 | e2e: Ajustes se abre desde el panel de Colo | ✅ |
| RF-2 | `manage-settings.test.ts` y `manage-services.test.ts` (cliente, invitado, sin sesión); integración caso 15; e2e: un cliente ve "No tenés acceso" | ✅ |
| RF-3 | Las acciones del servidor validan con zod y con el dominio; la integración llama a los casos de uso sin pasar por la pantalla | ✅ |
| RF-4 | e2e: los siete días, con "No atiende" | ✅ |
| RF-5 | Integración: franjas guardadas y usadas por la foto pública; caso 16 (dos guardados a la vez) | ✅ |
| RF-6 | `settings.test.ts` (paso, superposición, invertida, más de 4, 24:00); e2e: error junto al día | ✅ |
| RF-7 | `settings.test.ts` (copyDay); e2e caso 14 | ✅ |
| RF-8, RF-9 | `settings.test.ts` casos 1 a 3; `manage-settings.test.ts`; e2e: nombra el servicio | ✅ |
| RF-10 a RF-13 | `settings.test.ts` (días, horas, casos 5 a 7, aviso); integración (guardar, listar, borrar, quién lo cargó); e2e | ✅ |
| RF-14 | `notices.test.ts`; `BookingView.test.tsx` (avisos de la semana y ventana sin lugar); integración (solo avisos públicos en la foto); e2e | ✅ |
| RF-15 a RF-21 | `service.test.ts` (rangos, caso 9, orden); `manage-services.test.ts` (casos 9 a 11, RF-20, RF-21); integración (índice único); e2e en local | ✅ |
| RF-22 a RF-24 | `settings.test.ts`, `manage-settings.test.ts` (casos 12 y 13); e2e (WhatsApp mal escrito, 91 días, 7 días) | ✅ |
| RF-25 | e2e: "Guardado" y la página pública en la siguiente carga | ✅ |
| RF-26 | e2e: confirmación al salir con cambios | ✅ |
| RF-27 | Integración: fila en `settings_changes` con el usuario | ✅ |
| RF-28 | `manage-settings.test.ts` (Colo demo cambia el paso); el e2e usa Colo demo | ✅ |
| RNF-1 | `schema.test.ts`: puede lo que necesita; no borra servicios ni ajustes ni toca la auditoría | ✅ |
| RNF-2 | `settings.test.ts` y `notices.test.ts` corren en Buenos Aires, UTC y Tokio (`npm test`) | ✅ |
| RNF-3 | Las validaciones son funciones puras del dominio, usadas por la pantalla (listas de opciones) y el servidor | ✅ |
| RNF-4 | Errores junto al campo con `aria-describedby` y `aria-live`; capturas en 360 px | ✅ |
| RNF-5 | e2e con 4G lento: ver la mediana en la salida (local) | ✅ |
| RNF-6 | Nada propio de Vercel | ✅ |

**Casos límite:** 1 a 16 cubiertos (dominio, aplicación, integración o e2e).

**Pendiente:** T9 (despliegue con la migración y e2e en producción).

**Veredicto:** la spec se cumple en local; queda la verificación en producción.
