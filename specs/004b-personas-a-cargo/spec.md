# Spec 004b — Personas a cargo

Estado: implementada (en producción)

Origen: `docs/dominio.md` (P-16, I-17, I-18), `docs/casos-de-uso.md` (CU-31, CU-02 paso 1), spec 004 y las
respuestas de Gonzalo del 2026-11-22 (solo clientes con cuenta; no se quita a alguien con un turno pendiente).

## Contexto y objetivo

Muchos clientes de Colo son chicos que van con sus padres. Esta spec deja que un **titular** (cliente con
cuenta) cargue hasta **5 personas a cargo** y reserve, cancele o cambie los turnos de cada una desde su
propia cuenta. Cada persona es un cliente con su historial; el contacto es el del titular.

## Usuarios

- **Titular:** cliente con cuenta (hoy, los clientes de prueba). Gestiona sus personas a cargo y sus turnos.
- **Invitado:** no tiene personas a cargo (para un hijo, que cree una cuenta).
- **Barbero:** ve en la agenda para quién es cada turno y de quién está a cargo.

## Historias de usuario

- HU-1. Como titular, quiero cargar a mis hijos una sola vez, para sacarles turno sin repetir datos.
- HU-2. Como titular, quiero elegir para quién es el turno, para reservar el mío y el de mi hijo, incluso seguidos.
- HU-3. Como titular, quiero ver, cancelar y cambiar los turnos de cada uno desde mi cuenta.
- HU-4. Como barbero, quiero saber que el turno es de un chico y quién es su padre o madre, para contactarlo.

## Definiciones

- **Persona a cargo:** cliente sin cuenta, celular ni correo propios que pertenece a la cuenta de un titular
  (I-18). Solo tiene nombre (de 2 a 40 letras) y, opcionalmente, día y mes de cumpleaños.
- **Personas de la cuenta:** el titular y sus personas a cargo activas.

## Requisitos funcionales

**Gestionar personas a cargo (CU-31)**
- RF-1. MIENTRAS el cliente es titular (tiene cuenta), EL SISTEMA le muestra en "Mi perfil" la sección "Personas a cargo" con las que tiene y la opción de agregar otra.
- RF-2. CUANDO el titular agrega una persona con nombre válido y cumpleaños opcional, EL SISTEMA la crea en su cuenta; si el titular es de prueba, la persona también lo es y su nombre termina en "(demo)".
- RF-3. SI el titular ya tiene 5 personas a cargo, ENTONCES EL SISTEMA no ofrece agregar otra y rechaza el pedido si llega igual (I-17).
- RF-4. CUANDO el titular edita el nombre o el cumpleaños de una persona a cargo, EL SISTEMA lo guarda con las mismas reglas que al agregarla.
- RF-5. CUANDO el titular quita una persona a cargo sin turnos futuros activos, EL SISTEMA la anonimiza (no la borra: su historial queda sin datos personales) y deja de mostrarla.
- RF-6. SI la persona tiene un turno futuro activo, ENTONCES EL SISTEMA no la quita y le muestra ese turno para que lo cancele antes.
- RF-7. SI un invitado, el barbero, o un titular sobre una persona de otra cuenta intenta agregar, editar o quitar personas a cargo, ENTONCES EL SISTEMA no cambia nada.

**Reservar para otro (CU-02, P-16)**
- RF-8. MIENTRAS el titular tiene personas a cargo, EL SISTEMA pregunta "¿Para quién es el turno?" antes del servicio, con el titular ("Vos") y cada persona; las que ya tienen un turno futuro activo aparecen sin poder elegirse, con el motivo.
- RF-9. CUANDO el titular reserva para una persona a cargo, EL SISTEMA crea el turno a nombre de esa persona, con las mismas reglas de la spec 004 (horario libre, precio congelado, estado inicial).
- RF-10. EL SISTEMA permite un turno futuro activo por persona (no por cuenta): el titular y sus personas a cargo pueden tener turnos a la vez, incluso seguidos (I-3).
- RF-11. Para reservar para una persona a cargo, el titular necesita su nombre y celular cargados (RF-7 de la 004): se piden en el mismo resumen si faltan.

**Turnos de la cuenta**
- RF-12. EL SISTEMA muestra en la pantalla de turnos los turnos futuros activos de todas las personas de la cuenta, cada uno con para quién es, y en cada uno "Cambiar horario" y "Cancelar turno" con las reglas de la 004.
- RF-13. MIENTRAS alguna persona de la cuenta puede reservar, EL SISTEMA sigue ofreciendo reservar debajo de los turnos ("Reservá otro turno").
- RF-14. CUANDO Colo cancela o mueve el turno de una persona a cargo, EL SISTEMA le muestra el aviso al titular, nombrando a la persona ("Colo canceló el turno de Tomi del jueves 16:00: <motivo>").
- RF-15. EL SISTEMA no deja que un titular vea, cancele o mueva turnos de clientes que no son de su cuenta.

**Agenda de Colo**
- RF-16. EL SISTEMA muestra en la agenda el turno de una persona a cargo con su nombre y "a cargo de <titular>", y el celular del titular para contactarlo.

## Requisitos no funcionales

- RNF-1. **Consistencia:** el límite de 5 y el de un turno futuro por persona se cumplen aunque lleguen dos pedidos a la vez (bloqueo de la fila del titular y de la persona).
- RNF-2. **Privacidad:** de una persona a cargo solo se guardan nombre y cumpleaños; al quitarla, se borran los dos.
- RNF-3. **Velocidad, seguridad, accesibilidad y diseño:** como en la spec 004.

## Casos límite

1. El titular reserva Corte a las 16:00 para él y Corte a las 16:30 para su hijo: los dos turnos existen.
2. El titular intenta reservar dos turnos para el mismo hijo (otra pestaña): el segundo no se crea.
3. Sexta persona a cargo: no se agrega.
4. Quitar al hijo con un turno el viernes: no se quita y se muestra el turno; después de cancelarlo, se quita.
5. Un titular de prueba agrega "Tomi": queda "Tomi (demo)"; al editarlo a "Tomás" queda "Tomás (demo)".
6. Un invitado no ve la sección ni el "¿Para quién?".
7. Colo cancela el turno del hijo: el titular ve el aviso con el nombre del hijo.
8. Un pedido para reservar a nombre de una persona de otra cuenta: no se crea.
9. Quitada una persona, sus turnos pasados quedan en el historial sin nombre (anonimizada).

## Fuera de alcance

- Vincular un cliente cargado a mano por Colo a una cuenta (spec 005).
- Notificaciones push al titular por los turnos de sus personas a cargo (spec 006/007; la regla ya está en P-16).
- Faltas y bloqueos por persona (spec 008).
- Baja de la cuenta del titular completa (spec de publicación).

## Criterios de finalización

- Todos los RF con al menos un test automático; casos límite 1 a 9 cubiertos.
- e2e en producción con el cliente de prueba 1: agrega un hijo, reserva para él y para sí en horarios seguidos, Colo lo ve en la agenda "a cargo de", cancela todo y quita al hijo.
