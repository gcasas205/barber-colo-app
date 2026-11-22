# Validación — Spec 004: Reservar, cancelar y reprogramar

Fecha: 2026-11-22. Recorrido RF por RF contra los tests (en verde) y el e2e local `tests/e2e/turnos.py`
(más `login.py`, `ajustes.py`, `booking.py` y `csp.py`, actualizados a la entrada nueva). Falta T9 (producción).

| RF | Cómo se verifica | Resultado |
|---|---|---|
| RF-1 a RF-3 | e2e: la principal es el ingreso; `/turnos` sin sesión y `/ingresar` llevan a `/`; con sesión, cada uno a lo suyo | ✅ |
| RF-4 | `use-cases.test.ts` de Clientes (un toque, límite de 5 por hora); e2e | ✅ |
| RF-5 | e2e: el cliente entra directo a los turnos; el perfil queda opcional (`login.py`) | ✅ |
| RF-6, RF-7 | e2e (horarios como botones, resumen, nombre y celular si faltan); `saveContact` en memoria e integración | ✅ |
| RF-8 | `policy.test.ts` (estado inicial, caso 8); casos de uso; e2e ("Reservado") | ✅ |
| RF-9 | Casos de uso (franjas, bloqueos, anticipación, paso, ventana); el servidor recalcula con `dayStarts` | ✅ |
| RF-10 | Casos de uso (caso 13); integración con dos pestañas a la vez; e2e | ✅ |
| RF-11 | `saveContact` (caso 12, mismo invitado); e2e local | ✅ |
| RF-12 | Integración: restricción de exclusión con dos reservas simultáneas (caso 1); `appointments-schema.test.ts` | ✅ |
| RF-13 a RF-15 | Casos de uso (a tiempo, tarde con confirmación, margen de 10 min, caso 4 y 5); e2e | ✅ |
| RF-16 a RF-19 | Casos de uso (casos 6 a 8, límite de 2, ya empezó); e2e (reprogramar) | ✅ |
| RF-20 | Casos de uso e integración (aviso hasta cerrarlo); e2e | ✅ |
| RF-21 a RF-23 | Casos de uso ("Nuevo" por día, aviso de otros días); integración; e2e | ✅ |
| RF-24, RF-25 | Casos de uso (motivo obligatorio, caso 15, sin consumir el límite); `barberFreeStarts`; e2e | ✅ |
| RF-26 | Agenda con los bloqueos del día y su aviso (`blocksOn`) | ✅ |
| RF-27 | `manage-settings.test.ts` (caso 11, franjas); integración; e2e (lista con enlace a la agenda) | ✅ |
| RF-28 | Integración (caso 9: precio congelado); el turno guarda su servicio (caso 10) | ✅ |
| RF-29 | Integración: historial con actor, tipo y tarde | ✅ |
| RF-30 | Integración: la foto lleva solo lapsos; `getMyAppointment` solo del propio cliente | ✅ |
| RF-31 | pg_cron `invitados-abandonados`, probado a mano contra la base local (`DELETE 0`) | ✅ |
| RNF-1 | e2e con 4G lento: ingreso 566 ms, reservar 310 ms (medianas, local) | ✅ |
| RNF-2 | Restricción de exclusión + savepoint (la transacción sigue viva tras el rechazo) | ✅ |
| RNF-3 | Grants mínimos sin `delete`; CSP con nonce en todas las pantallas (`headers.test.ts`, `csp.py`) | ✅ |
| RNF-4 | Dominio puro, probado en Buenos Aires, UTC y Tokio | ✅ |
| RNF-5 | Capturas en 360 px (ingreso, turnos, resumen, agenda) | ✅ |
| RNF-6 | Nada propio de Vercel | ✅ |

**Casos límite:** 1 a 16 cubiertos (el 14 por `dayStarts`: el servicio entra completo o no se ofrece; el 16
porque los plazos los decide el servidor con su hora).

**Hallazgos durante la implementación:**
- Kysely no confirma una transacción que Postgres abortó: ante un rechazo esperado (superposición, nombre
  repetido) se usa un savepoint (`src/shared/db/guarded.ts`). Corrige también una carrera de la spec 003.
- "Visto" por día en la agenda: abrir el panel no borra la marca de los turnos nuevos de otros días.
- `demo:purge` borra también los turnos de los clientes de prueba.

**Veredicto:** la spec se cumple en local; queda la verificación en producción (T9).
