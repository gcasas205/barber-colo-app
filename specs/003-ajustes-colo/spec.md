# Spec 003 — Ajustes de Colo

Estado: aprobada (2026-11-21), con las resoluciones de `clarificacion.md`

Origen: `docs/analisis.md` (RN-01, RN-36, RN-38 · RF-04, RF-05, RF-41 a RF-44), spec 001 (RF-12 a RF-14 y
"Fuera de alcance": regla del paso), spec 002 (rol barbero, D-13 a D-15) y las respuestas de Gonzalo del
2026-11-21.
Diseño: `docs/diseno/04-interfaz.md` (Ajustes → Servicios, `/prototipo/ajustes`) · Interfaz: `DESIGN.md`

## Contexto y objetivo

Hoy la agenda (franjas, paso, servicios y contacto) quedó cargada en la base con los valores iniciales de la
spec 001, y solo se cambia con una migración. Las franjas de 10 a 13 y de 14 a 20 siguen siendo
provisorias. Esta spec le da a Colo una pantalla de **Ajustes** para manejar su agenda desde el celular:
cuándo atiende, cada cuánto empiezan los turnos, cuándo no atiende (feriados, vacaciones, un trámite), qué
servicios ofrece y a qué precio, con cuánta anticipación se reserva y a qué WhatsApp le escriben.

Lo que Colo guarda se ve en la página pública en la siguiente carga, sin que nadie toque código.

## Usuarios

- **Barbero:** Colo, o la cuenta de prueba "Colo (demo)". Es el único que ve y usa Ajustes.
- **Visitante:** ve en la página pública el resultado de los ajustes (horarios, servicios, avisos de bloqueo).
- **Cliente o invitado con sesión:** igual que el visitante; no puede entrar a Ajustes.

## Historias de usuario

- HU-1. Como barbero, quiero cargar los días y horarios en que atiendo, para que solo se ofrezcan turnos cuando estoy.
- HU-2. Como barbero, quiero elegir cada cuántos minutos puede empezar un turno, para ordenar mi día.
- HU-3. Como barbero, quiero bloquear un día, varios días o unas horas, con un aviso para los clientes, para que nadie reserve cuando no estoy y sepan por qué.
- HU-4. Como barbero, quiero agregar, editar, ordenar, sacar y volver a ofrecer servicios, para que la lista y los precios estén al día.
- HU-5. Como barbero, quiero decidir con cuánta anticipación y hasta cuántos días adelante se puede reservar, y a qué WhatsApp me escriben, para adaptarlo a mi forma de trabajar.

## Definiciones

Se usan las de la spec 001 (franja, paso, bloqueo, horario libre, hoy, ventana de reserva). Además:

- **Bloqueo de días:** desde las 00:00 del primer día hasta las 24:00 del último (hora de Buenos Aires). Un solo día es un bloqueo de días con el mismo primer y último día.
- **Bloqueo de horas:** dentro de un mismo día, de una hora a otra.
- **Aviso del bloqueo:** texto opcional que Colo escribe para los clientes (por ejemplo, "Vacaciones"). Hasta 80 caracteres.
- **Bloqueo vigente:** el que todavía no terminó.
- **Anticipación mínima:** cuánto tiempo antes del inicio se puede reservar un horario.
- **Días a futuro:** el último día de la ventana de reserva es hoy + ese número.

**Rangos permitidos** (aprobados):

| Parámetro | Valores |
|---|---|
| Paso | 5, 10, 15, 20, 30 o 60 min (RF-12 de la 001) |
| Franjas por día | De 0 a 4 |
| Anticipación mínima | De 0 a 48 h, de a 15 min |
| Días a futuro | De 1 a 90 |
| Duración de un servicio | Múltiplo del paso, de un paso a 10 h |
| Precio | Pesos enteros, de $ 1 a $ 9.999.999 |
| Nombre de un servicio | 1 a 60 caracteres · Qué incluye: hasta 200 |

## Requisitos funcionales

**Acceso**
- RF-1. EL SISTEMA muestra Ajustes solo a quien tiene el rol de barbero (Colo o Colo demo) y lo ofrece desde el panel de Colo.
- RF-2. SI alguien sin el rol de barbero abre Ajustes o envía un cambio de ajustes, ENTONCES EL SISTEMA no muestra ningún dato, no guarda nada y lo lleva a la pantalla de ingreso (sin sesión) o a la pública (con sesión de cliente o invitado).
- RF-3. EL SISTEMA valida todos los cambios de ajustes en el servidor con las mismas reglas que muestra la pantalla; una validación solo del navegador no alcanza.

**Franjas semanales**
- RF-4. EL SISTEMA muestra los siete días de la semana, de lunes a domingo, cada uno con sus franjas o "No atiende".
- RF-5. CUANDO Colo agrega, cambia o saca franjas de uno o varios días y guarda, EL SISTEMA las aplica de una sola vez (o se guardan todas o ninguna) y la página pública calcula los horarios libres con las franjas nuevas.
- RF-6. SI una franja abre o cierra en una hora que no es múltiplo del paso, cierra antes o a la misma hora en que abre, se superpone con otra del mismo día o el día tendría más de 4 franjas, ENTONCES EL SISTEMA no guarda nada e indica el día y el problema junto a ese día.
- RF-7. EL SISTEMA permite copiar las franjas de un día a otros días de la semana antes de guardar.

**Paso de la agenda**
- RF-8. CUANDO Colo cambia el paso y guarda, EL SISTEMA lo aplica a los horarios libres desde ese momento.
- RF-9. SI con el paso nuevo alguna duración de un servicio activo o alguna hora de una franja dejaría de ser múltiplo del paso, ENTONCES EL SISTEMA no lo cambia y lista qué servicios y qué días hay que ajustar antes (decisión de la spec 001).

**Bloqueos**
- RF-10. CUANDO Colo carga un bloqueo de días (uno o varios días seguidos) o de horas (un día, de una hora a otra), con o sin aviso, EL SISTEMA lo guarda y deja de ofrecer los horarios que caen dentro.
- RF-11. SI un bloqueo de horas no termina después de empezar, un bloqueo de días tiene el último día antes del primero o un bloqueo termina antes del momento en que se carga, ENTONCES EL SISTEMA no lo guarda e indica el problema junto al campo.
- RF-12. EL SISTEMA muestra los bloqueos vigentes ordenados por inicio, cada uno con sus fechas y horas y su aviso, y permite borrar cualquiera. Al borrarlo, esos horarios vuelven a ofrecerse.
- RF-13. EL SISTEMA permite que dos bloqueos se superpongan (por ejemplo, un feriado dentro de las vacaciones); el período bloqueado es la unión de los dos.
- RF-14. CUANDO un visitante ve un día que tiene un bloqueo con aviso, EL SISTEMA muestra el aviso debajo de la semana, con el día: "Cerrado: <aviso>" si el bloqueo cubre todo el día, o "<hora> a <hora>: <aviso>" si cubre una parte. Sin aviso, el día solo muestra los horarios que quedan (o "sin lugar").

**Servicios**
- RF-15. EL SISTEMA lista a Colo todos los servicios: primero los que se ofrecen, en el orden en que los ven los clientes, y después los sacados, marcados como "No se ofrece".
- RF-16. CUANDO Colo agrega o edita un servicio (nombre, qué incluye, duración, precio, si suma para beneficios), EL SISTEMA lo guarda y lo aplica a las reservas nuevas (RF-42 del análisis). El servicio nuevo se agrega al final de la lista.
- RF-17. SI un servicio tiene precio con centavos, menor que $ 1 o mayor que $ 9.999.999, duración que no es múltiplo del paso o fuera de rango, o el mismo nombre que otro servicio que se ofrece (sin importar mayúsculas ni espacios en los extremos), ENTONCES EL SISTEMA no lo guarda e indica el problema junto al campo.
- RF-18. CUANDO Colo cambia el orden de los servicios que se ofrecen (subir o bajar), EL SISTEMA lo guarda y la página pública los muestra en ese orden.
- RF-19. CUANDO Colo saca un servicio, EL SISTEMA deja de ofrecerlo para reservas nuevas y lo conserva para el historial (no se borra; RF-44 del análisis).
- RF-20. CUANDO Colo vuelve a ofrecer un servicio sacado, EL SISTEMA lo agrega al final de los que se ofrecen, salvo que su nombre choque con otro que se ofrece o su duración no sea múltiplo del paso actual: en ese caso no lo reactiva y explica qué cambiar.
- RF-21. SI Colo intenta sacar el último servicio que se ofrece, ENTONCES EL SISTEMA le avisa que la página pública va a mostrar "Por ahora no hay turnos online" (RF-2b de la 001) y le pide confirmar.

**Reserva y contacto**
- RF-22. CUANDO Colo cambia la anticipación mínima o los días a futuro dentro de los rangos permitidos, EL SISTEMA los aplica a los horarios libres desde ese momento; la página pública dice "en los próximos <N> días" con el valor nuevo.
- RF-23. CUANDO Colo cambia el WhatsApp de contacto, EL SISTEMA lo acepta en el formato de un celular argentino (como el teléfono de la spec 002) y lo usa en todos los botones y enlaces de WhatsApp de la app.
- RF-24. SI un valor de anticipación, días a futuro o WhatsApp está fuera de rango o mal escrito, ENTONCES EL SISTEMA no lo guarda e indica el problema junto al campo.

**General**
- RF-25. CUANDO Colo guarda un cambio, EL SISTEMA confirma "Guardado" y la página pública lo muestra en la siguiente carga (una página que ya estaba abierta lo muestra al recargarla).
- RF-26. SI Colo sale de una sección con cambios sin guardar, ENTONCES EL SISTEMA le avisa antes de perderlos.
- RF-27. EL SISTEMA registra en cada cambio de ajustes quién lo hizo (Colo o Colo demo) y cuándo, sin mostrarlo en la página pública.
- RF-28. EL SISTEMA permite que Colo demo cambie todo, igual que Colo, y esos cambios se ven en la página pública (D-15; no hay "restaurar valores").

## Requisitos no funcionales

- RNF-1. **Seguridad:** las escrituras pasan solo por el servidor con el rol `app_server`, que recibe únicamente los permisos de escritura que esta spec necesita; las pantallas de Ajustes usan la CSP con nonce de la spec 002.
- RNF-2. **Hora local:** fechas y horas de bloqueos y franjas se cargan y se muestran en la hora de Buenos Aires, sea cual sea la zona del dispositivo o del servidor.
- RNF-3. **Lógica verificable:** las validaciones (franjas, paso, servicios, bloqueos, rangos) son funciones puras con tests, y las mismas corren en la pantalla y en el servidor.
- RNF-4. **Accesibilidad y diseño:** como en la 001 y la 002 (`DESIGN.md`, 360 px, teclado, lector de pantalla, contraste AA, claro y oscuro); los errores van junto al campo y se anuncian.
- RNF-5. **Velocidad:** con el 4G lento simulado de la 001, abrir una sección de Ajustes tarda menos de 1,5 s y guardar un cambio, menos de 1 s.
- RNF-6. **Portabilidad:** nada depende de servicios propios de Vercel (D-16).

## Casos límite

1. Paso de 15 a 20 min con Corte de 30 min: no se permite (30 no es múltiplo de 20); se lista Corte.
2. Paso de 15 a 30 min con la franja de 10:00 a 13:00 y Claritos de 120 min: se permite.
3. Paso de 15 a 60 min con una franja que abre a las 10:30: no se permite; se lista ese día.
4. Franja de 13:00 a 14:00 entre dos franjas de 10 a 13 y 14 a 20: se permite (se tocan en los bordes).
5. Bloqueo de horas de 10:00 a 11:00 un día que ya tiene un bloqueo de todo el día: se permite; el día sigue cerrado.
6. Bloqueo de días del 24 al 31 de diciembre cargado el 24 a las 18:00: se permite (termina después de ahora).
7. Bloqueo de horas de hoy de 09:00 a 10:00 cargado a las 11:00: se rechaza (ya terminó).
8. Bloqueo que empieza dentro de la ventana y termina después de ella: se guarda completo.
9. Dos servicios "Corte" y " corte ": el segundo se rechaza mientras el primero se ofrece; si el primero está sacado, se permite.
10. Reactivar "Corte" (sacado) cuando hay otro "Corte" que se ofrece: se rechaza y se explica.
11. Sacar los tres servicios: con confirmación, la página pública muestra "Por ahora no hay turnos online".
12. Días a futuro de 30 a 7: los días de hoy + 8 en adelante dejan de aparecer.
13. Anticipación mínima de 0: se ofrece un horario que empieza en el minuto siguiente al actual.
14. Domingo sin franjas al que se le copian las del sábado: aparece con horarios en la página pública.
15. Un cliente con sesión envía a mano el formulario de Ajustes: se rechaza y no cambia nada (RF-2).
16. Dos pestañas de Colo guardan las franjas casi al mismo tiempo: queda la última que se guardó, completa (nunca una mezcla de las dos).

## Fuera de alcance

- Turnos reservados: todavía no existen (spec 004). Qué pasa con un turno que queda dentro de un bloqueo nuevo, fuera de una franja que se achica o con un servicio que se saca (avisar al cliente, RF-05 del análisis) se define en la 004, que deberá revisar estas pantallas.
- Franjas distintas para una fecha puntual (por ejemplo, un sábado que abre más tarde): se resuelve con un bloqueo de horas.
- Bloqueos que se repiten (por ejemplo, todos los miércoles a la tarde): se resuelve con las franjas.
- Feriados automáticos.
- Editar un bloqueo: se borra y se vuelve a cargar.
- Borrar servicios definitivamente.
- Historial visible de cambios (RF-27 solo lo registra).
- La anticipación para pedir aprobación (`approval_min_notice_minutes`, spec 008).
- Restaurar los valores iniciales de la demo (D-15).

## Criterios de finalización

- Todos los RF tienen al menos un test automático en verde, y los casos límite 1 a 16 están cubiertos.
- e2e en producción: Colo demo cambia una franja, el paso, un bloqueo con aviso, un servicio y el WhatsApp, y la página pública lo refleja; un cliente de prueba no puede abrir Ajustes.
- Las franjas definitivas las carga Colo (o Gonzalo con la cuenta de prueba) desde Ajustes, y dejan de ser provisorias.

## Dudas abiertas

- Ninguna. Rangos permitidos aprobados como están (2026-11-21).
