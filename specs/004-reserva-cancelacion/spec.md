# Spec 004 — Reservar, cancelar y reprogramar

Estado: aprobada (2026-11-22), con las resoluciones de `clarificacion.md`

Origen: `docs/analisis.md` (RN-03 a RN-06b, RN-10, RN-11, RN-31, RN-33, RN-37, RN-38 · RF-08 a RF-13, RF-39,
RF-40), `docs/dominio.md` (agregado Turno, ciclo de vida, P-05, P-07, P-14), specs 001 a 003 y las respuestas
de Gonzalo del 2026-11-21.
Diseño: `docs/diseno/04-interfaz.md` · Interfaz: `DESIGN.md`

## Contexto y objetivo

Hasta ahora la app muestra los horarios libres, pero los turnos se siguen pidiendo por WhatsApp. Esta spec
hace que el cliente **reserve, cancele y cambie de horario su turno desde la app**, y que Colo vea su
agenda y pueda cancelar o mover un turno explicando el motivo.

Además cambia la entrada a la app (pedido de Gonzalo): **la pantalla de ingreso pasa a ser la principal**.
Después de ingresar (con una cuenta o como invitado), la pantalla principal es la de los turnos. El nombre y
el celular se piden **recién al reservar**, y solo si todavía no están cargados.

## Usuarios

- **Cliente con cuenta:** hoy, los clientes de prueba (la cuenta de Google llega con la spec de publicación).
- **Invitado:** entra con un toque, sin cuenta. Queda identificado por su celular al reservar (D-12).
- **Barbero:** Colo, o Colo demo (D-15). Ve la agenda, cancela y reprograma con motivo.

## Historias de usuario

- HU-1. Como cliente, quiero abrir la app y ver de entrada cómo ingresar, para llegar rápido a los turnos.
- HU-2. Como cliente o invitado, quiero reservar un horario libre en pocos toques, cargando mis datos solo la primera vez.
- HU-3. Como cliente, quiero ver mi turno y poder cancelarlo o pasarlo a otro horario, sabiendo si queda registrado como tarde.
- HU-4. Como barbero, quiero ver la agenda del día con los turnos nuevos marcados, para enterarme de las reservas.
- HU-5. Como barbero, quiero cancelar o mover un turno con un motivo que le llegue al cliente.
- HU-6. Como barbero, quiero que al bloquear horarios la app me avise qué turnos quedan adentro, para resolverlos antes.

## Definiciones

- **Turno activo:** en estado Reservado o Confirmado (en esta spec no existen todavía PendienteAprobación ni
  SinConfirmar: specs 007 y 008). Ocupa su horario.
- **Turno futuro activo:** activo y que todavía no empezó.
- **Plazo de cancelación:** 4 h antes del inicio (RN-10). **Margen de corrección:** los 10 min siguientes a
  reservar (RN-33, RF-39).
- **Cancelación o reprogramación tarde:** la del cliente con menos de 4 h de anticipación y fuera del margen
  de corrección. Queda registrada; no tiene otra consecuencia (RN-11, P-14).
- **Reprogramar:** mover el mismo turno a otro horario libre del mismo servicio. Conserva el precio y su
  historial (P-14).
- **Precio congelado:** el precio del servicio en el momento de reservar (RN-06b, RF-40).
- **Turno nuevo para Colo:** reservado o reprogramado por un cliente después de la última vez que Colo abrió
  la agenda.

## Requisitos funcionales

**Ingreso como pantalla principal**
- RF-1. EL SISTEMA muestra la pantalla de ingreso (cuentas de prueba, correo y contraseña, "Entrar como invitado") en la dirección principal de la app.
- RF-2. MIENTRAS hay una sesión de cliente o invitado, EL SISTEMA lleva la dirección principal y la de ingreso a la pantalla de turnos; con la sesión de Colo, a su agenda.
- RF-3. CUANDO alguien sin sesión abre la pantalla de turnos, su perfil o el panel de Colo, EL SISTEMA lo lleva a la pantalla de ingreso; las direcciones viejas (`/ingresar` y las de horarios con parámetros) siguen funcionando.
- RF-4. CUANDO alguien toca "Entrar como invitado", EL SISTEMA abre una sesión de invitado sin pedir datos, mantiene el aviso de que como invitado no accede a los descuentos y el límite de 5 intentos por hora por conexión (RF-18b de la 002).
- RF-5. CUANDO un cliente con cuenta ingresa, EL SISTEMA lo lleva a la pantalla de turnos aunque su perfil esté incompleto; el perfil se puede completar o editar desde "Mi perfil", sin obligación.

**Reservar**
- RF-6. EL SISTEMA muestra en la pantalla de turnos los servicios, los días y los horarios libres como en la spec 001, y cada horario libre se puede elegir.
- RF-7. CUANDO se elige un horario, EL SISTEMA muestra un resumen (servicio, día, hora de inicio y fin, precio) y el botón "Reservar"; SI al cliente o invitado le falta el nombre o el celular, ENTONCES el resumen pide esos datos, con las reglas y los errores de la spec 002, y los guarda junto con la reserva.
- RF-8. CUANDO se confirma la reserva de un horario libre, EL SISTEMA crea el turno con el precio congelado y lo muestra como "Tu turno"; si faltan menos de 1 h para el inicio nace Confirmado (RN-31), si no, Reservado.
- RF-9. SI el horario ya no está libre al confirmar (otra reserva, un bloqueo, la anticipación mínima o la ventana), ENTONCES EL SISTEMA no crea el turno, avisa "Ese horario se acaba de ocupar" y muestra los horarios actualizados (RF-10 del análisis).
- RF-10. SI el cliente o invitado ya tiene un turno futuro activo, ENTONCES EL SISTEMA no le permite reservar otro y le muestra el que tiene (RN-05).
- RF-11. SI un invitado carga un celular que pertenece a una cuenta, ENTONCES EL SISTEMA no reserva y le pide ingresar con esa cuenta (RF-16 de la 002); SI el celular es de otro invitado, ENTONCES el turno queda a nombre de ese cliente y el dispositivo queda asociado a él (RF-17 de la 002).
- RF-12. EL SISTEMA nunca deja dos turnos activos superpuestos, ni un turno activo dentro de un bloqueo o fuera de las franjas, aunque dos personas reserven a la vez (RN-03, I-2).

**Mi turno: cancelar y reprogramar**
- RF-13. MIENTRAS el cliente o invitado tiene un turno futuro activo, EL SISTEMA lo muestra arriba de la pantalla de turnos con servicio, día, hora, precio congelado, estado y las acciones "Cancelar turno" y "Cambiar horario".
- RF-14. CUANDO el cliente cancela con 4 h o más de anticipación, o dentro del margen de corrección, EL SISTEMA cancela el turno, libera el horario y no lo registra como tarde (RF-12 y RF-39 del análisis).
- RF-15. SI el cliente cancela con menos de 4 h y fuera del margen de corrección, ENTONCES EL SISTEMA le advierte que quedará registrado como cancelación tarde y, con su confirmación, lo cancela y lo registra como tarde (RF-13 del análisis).
- RF-16. CUANDO el cliente elige "Cambiar horario", EL SISTEMA le muestra los horarios libres de ese servicio (su propio turno cuenta como libre) y, al confirmar uno, mueve el mismo turno con su precio congelado; el estado se recalcula como en RF-8 (P-14).
- RF-17. SI la reprogramación es con menos de 4 h y fuera del margen de corrección, ENTONCES EL SISTEMA advierte que quedará registrada como reprogramación tarde y, con su confirmación, la registra así.
- RF-18. SI el cliente ya reprogramó 2 veces ese turno, ENTONCES EL SISTEMA no ofrece "Cambiar horario" y le explica que puede cancelar y reservar de nuevo (I-7b).
- RF-19. SI el turno ya empezó, ENTONCES EL SISTEMA no permite cancelarlo ni reprogramarlo desde la app.
- RF-20. CUANDO Colo canceló o movió el turno de un cliente, EL SISTEMA se lo muestra en la pantalla de turnos la próxima vez que entra ("Colo canceló tu turno del jueves 16:00: <motivo>" o "Colo pasó tu turno al viernes 11:00: <motivo>") hasta que el cliente lo cierra.

**Agenda de Colo**
- RF-21. EL SISTEMA muestra a Colo, como pantalla principal de su panel, la agenda de un día (hoy por defecto) con flechas al día anterior y al siguiente; Clientes y Ajustes quedan como secciones del panel.
- RF-22. EL SISTEMA lista los turnos activos del día por hora, con hora de inicio y fin, servicio, precio congelado, estado, nombre del cliente con su sobrenombre, celular (con enlace a WhatsApp) y si es invitado, y marca "Nuevo" los turnos nuevos para Colo.
- RF-23. CUANDO Colo abre la agenda, EL SISTEMA deja de marcar como nuevos los turnos que ya vio (la marca dura esa visita).
- RF-24. CUANDO Colo cancela un turno, EL SISTEMA le pide el motivo (obligatorio, de 3 a 200 caracteres), lo cancela sin consecuencias para el cliente y libera el horario (P-05).
- RF-25. CUANDO Colo mueve un turno, EL SISTEMA le pide el motivo y el horario nuevo entre los libres de ese servicio (sin exigir la anticipación mínima ni la ventana de reserva), lo mueve sin registrarlo como tarde y sin consumir el límite del cliente (P-14).
- RF-26. EL SISTEMA muestra en la agenda los días con bloqueos con su aviso, para que Colo sepa por qué no hay turnos.

**Choques con Ajustes**
- RF-27. SI Colo intenta guardar un bloqueo o unas franjas que dejan afuera turnos futuros activos, ENTONCES EL SISTEMA no guarda el cambio y le lista esos turnos (día, hora, cliente) con un enlace a la agenda de ese día para cancelarlos o moverlos.
- RF-28. CUANDO Colo cambia el precio de un servicio o lo deja de ofrecer, EL SISTEMA mantiene los turnos ya reservados con su servicio y su precio congelado (RF-40).

**Historial y privacidad**
- RF-29. EL SISTEMA registra cada reserva, cancelación y reprogramación del turno con quién la hizo, cuándo, el horario anterior y el nuevo, si fue tarde y el motivo (I-7).
- RF-30. EL SISTEMA nunca muestra a un cliente o invitado datos de otro cliente; la foto de la agenda sigue llevando solo lapsos ocupados (S-7).
- RF-31. EL SISTEMA borra cada día las sesiones de invitado de más de 60 días sin uso que nunca reservaron.

## Requisitos no funcionales

- RNF-1. **Velocidad:** con el 4G lento de la 001, reservar, cancelar o reprogramar tarda menos de 1 s desde que se toca el botón hasta ver el resultado; la pantalla de ingreso carga en menos de 1,5 s.
- RNF-2. **Consistencia:** la garantía de RF-12 la da la base de datos (no solo el código), y cada operación sobre un turno es atómica.
- RNF-3. **Seguridad:** como en la 002 y la 003 (CSP con nonce en las pantallas con sesión, `app_server` con permisos mínimos, validación en el servidor de todo lo que llega).
- RNF-4. **Hora local y lógica pura:** plazos, estados y horarios libres son funciones puras con "ahora" como parámetro, probadas en Buenos Aires, UTC y Tokio.
- RNF-5. **Accesibilidad y diseño:** como en las specs anteriores (`DESIGN.md`, 360 px, teclado, lector de pantalla, contraste AA, claro y oscuro).
- RNF-6. **Portabilidad:** nada propio de Vercel (D-16).

## Casos límite

1. Dos personas confirman el mismo horario a la vez: una reserva, la otra ve RF-9.
2. Corte de 30 min a las 10:00 y Claritos (120 min) que empezaría a las 09:00: Claritos no se ofrece desde las 09:00 hasta las 10:00 (se superpondría).
3. Reserva a las 15:20 para las 16:00: nace Confirmado; cancelar a las 15:25 está dentro del margen (no es tarde).
4. Reserva a las 08:00 para las 11:00 (menos de 4 h): cancelar a las 08:09 no es tarde; a las 08:11 es tarde.
5. Cancelar a las 12:00 un turno de las 16:00 (exactamente 4 h): no es tarde.
6. Reprogramar un turno de las 16:00 a las 16:15 del mismo día: su propio horario cuenta como libre.
7. Tercera reprogramación del cliente: no se ofrece. Colo sí puede moverlo (no consume el límite).
8. Un turno Confirmado reprogramado para dentro de 3 h vuelve a Reservado; para dentro de 40 min queda Confirmado.
9. Colo sube el precio de Corte después de una reserva: el turno conserva el precio viejo.
10. Colo deja de ofrecer Claritos con un turno de Claritos reservado: el turno sigue.
11. Colo carga vacaciones que cubren dos turnos: no se guarda y ve los dos turnos para resolverlos.
12. Un invitado reserva con el celular de un cliente con cuenta: no reserva y se le pide ingresar.
13. Un cliente con turno futuro intenta reservar otro (por ejemplo, desde otra pestaña): no se crea.
14. Un turno que cruza el límite de la ventana de reserva (último día) no existe: el servicio entra completo o no se ofrece.
15. Colo mueve un turno a las 21:00 de hoy, fuera de la anticipación mínima: se permite, si el horario está dentro de las franjas y libre.
16. El reloj del dispositivo del cliente está mal: los plazos los decide el servidor.

## Fuera de alcance

- **Personas a cargo** (P-16): spec 004b, a continuación.
- Notificaciones (push, recordatorio, pedido de confirmación, avisos a Colo): specs 006 y 007. Hasta entonces Colo se entera por la agenda y el cliente por la pantalla de turnos.
- Confirmación 1 h antes, SinConfirmar, PendienteAprobación por faltas, marcar asistencia: specs 007 y 008.
- Descuentos y precio final con beneficios: spec 009 (en esta spec se muestra el precio del servicio).
- Turnos que carga Colo a mano y enlace secreto: spec 005.
- Historial de turnos pasados del cliente y ficha de Colo: specs posteriores (el historial se registra desde ahora).
- Ingreso con Google: spec de publicación.

## Criterios de finalización

- Todos los RF con al menos un test automático en verde; casos límite 1 a 16 cubiertos.
- e2e en producción: ingreso como pantalla principal; un cliente de prueba reserva, reprograma y cancela; un
  invitado reserva cargando nombre y celular; Colo ve el turno nuevo en su agenda y cancela otro con motivo,
  que el cliente ve. Todo lo que crea la prueba queda cancelado al terminar.
- Velocidad (RNF-1) medida en producción.

## Dudas abiertas

- Ninguna: alcance y decisiones respondidas por Gonzalo el 2026-11-21 (ingreso solo con sesión, datos al
  reservar, personas a cargo en la 004b, agenda como pantalla principal de Colo, choques con Ajustes: avisar y
  que Colo decida).
