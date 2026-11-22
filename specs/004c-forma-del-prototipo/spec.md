# Spec 004c — La forma del prototipo en las pantallas reales

Estado: aprobada (2026-11-22)

Origen: `DESIGN.md` (navegación, layout web), `docs/diseno/04-interfaz.md`, el prototipo (`/prototipo`,
`docs/diseno/assets/prototipo-*.png`) y las respuestas de Gonzalo del 2026-11-22: pasada visual antes de la 005;
el cliente tiene Inicio, Reservar y Perfil; las pestañas de Colo pasan a la barra inferior.

## Contexto y objetivo

Las pantallas reales (specs 002 a 004b) siguen el estilo del prototipo, pero no su **forma**: no tienen la barra
inferior ni el riel lateral, el cliente reserva y ve sus turnos en una sola pantalla larga, y el resumen de la
reserva queda abajo de todo. Esta spec lleva esa forma a las pantallas que ya existen, para que las specs
siguientes (campanita, confirmar, asistencia, beneficios, números) se sumen sobre ella. **No cambia ninguna regla
ni dato**: solo dónde y cómo se ven.

## Usuarios

- **Cliente** (con cuenta o invitado): Inicio, Reservar y Perfil.
- **Barbero (Colo):** Agenda, Clientes y Ajustes.

## Historias de usuario

- HU-1. Como cliente, quiero abrir la app y ver enseguida mi próximo turno y el de mis hijos, y reservar con un toque.
- HU-2. Como cliente, quiero ver siempre qué estoy por reservar y el precio, sin bajar hasta el final.
- HU-3. Como cliente o como Colo, quiero cambiar de sección con el pulgar, abajo, como en cualquier app.
- HU-4. Como Colo, en la computadora quiero las secciones a un costado y aprovechar el ancho.

## Requisitos funcionales

**Navegación**
- RF-1. MIENTRAS la pantalla mide menos de 1024 px, EL SISTEMA muestra abajo la barra de esmalte con las
  secciones: cliente → Inicio, Reservar y Perfil; Colo → Agenda, Clientes y Ajustes.
- RF-2. MIENTRAS la pantalla mide 1024 px o más, EL SISTEMA reemplaza la barra por el riel lateral de esmalte con la
  insignia, "El Colo · Barbería y Peluquería" y las mismas secciones.
- RF-3. CUANDO se toca una sección, EL SISTEMA la marca al instante (como las pestañas de hoy) y la marcada es
  siempre la de la pantalla que se ve, al ir y volver.
- RF-4. EL SISTEMA muestra en la chapa superior el nombre de la sección en letras de chapa (INICIO, RESERVAR, MI
  PERFIL, AGENDA, CLIENTES, AJUSTES), el interruptor de tema y, en el celular, la insignia.

**Inicio del cliente**
- RF-5. EL SISTEMA saluda "Hola, <nombre>" (sin "(demo)"), o "Hola" si todavía no cargó su nombre.
- RF-6. MIENTRAS el cliente tiene turnos futuros, EL SISTEMA muestra cada uno en una chapa de esmalte ("Tu próximo
  turno" o "Turno de Tomi"): día y hora grandes, estado, servicio y precio, con "Cambiar horario" y "Cancelar"
  (reglas de la 004).
- RF-7. MIENTRAS una persona a cargo no tiene turno, EL SISTEMA muestra su nombre con "Sin turno reservado".
- RF-8. MIENTRAS alguien de la cuenta puede reservar, EL SISTEMA muestra el botón rojo "Reservar turno", que lleva
  a Reservar. El aviso de Colo (cancelación o cambio) sigue arriba de todo.

**Reservar**
- RF-9. EL SISTEMA muestra, en este orden: "¿Para quién es?" (solo con personas a cargo, como un selector de
  opciones lado a lado; quien ya tiene turno, sin poder elegirse), Servicio, Día y horarios libres.
- RF-10. MIENTRAS se elige, EL SISTEMA muestra fija abajo, sobre la barra de secciones, el resumen: servicio,
  horario elegido (o "elegí un horario"), para quién y el precio, con el botón "Reservar" (deshabilitado hasta
  elegir un horario). En la computadora, el resumen es una columna "Tu reserva" al costado, con "Podés cancelar o
  cambiar el horario sin problema hasta 4 horas antes".
- RF-11. SI faltan el nombre o el celular (RF-7 de la 004), ENTONCES EL SISTEMA los pide en el resumen al tocar
  "Reservar", antes de confirmar.
- RF-12. CUANDO la reserva se confirma, EL SISTEMA lleva a Inicio con el mensaje "¡Listo! Reservaste…".
- RF-13. CUANDO el cliente toca "Cambiar horario" en Inicio, EL SISTEMA abre Reservar para ese turno (servicio
  fijo, "Elegí el horario nuevo") y, al confirmar, vuelve a Inicio con el mensaje.
- RF-14. SI nadie de la cuenta puede reservar (todos tienen turno), ENTONCES Reservar lo dice y ofrece volver a Inicio.

**Colo**
- RF-15. La agenda, Clientes y Ajustes no cambian de contenido: solo pasan a la barra inferior o al riel, y en la
  computadora usan el ancho (contenido de hasta 1152 px).

## Requisitos no funcionales

- RNF-1. **Velocidad:** cambiar de sección se marca en menos de 50 ms y, si la pantalla ya se vio, llega en menos de
  100 ms (4G simulado); reservar sigue en menos de 1 s.
- RNF-2. **Accesibilidad:** la sección actual con `aria-current`; la barra y el riel como navegación con nombre; el
  resumen fijo no tapa contenido (el final de la página queda visible); controles de 48 px o más.
- RNF-3. **Diseño:** `DESIGN.md` (un solo botón rojo por pantalla, esmalte para la selección, área segura del
  celular); mobile-first a 360 px; claro y oscuro.
- RNF-4. **Sin regresiones:** las reglas y los e2e de las specs 001 a 004b siguen valiendo (los selectores se
  ajustan a la forma nueva).

## Casos límite

1. Cliente sin turnos ni personas a cargo: "Hola, Martín", "No tenés turnos reservados" y "Reservar turno".
2. Invitado que todavía no cargó su nombre: "Hola" y "Reservar turno".
3. Titular con turno y dos hijos, uno con turno: tres bloques en Inicio y "Reservar turno" (para el hijo libre).
4. Todos con turno: Inicio sin "Reservar turno"; la sección Reservar dice que no hay a quién reservar.
5. Celular de 360 px con el teclado abierto en el resumen (nombre y celular): el botón "Reservar" queda visible.
6. Colo en la computadora a 1440 px: riel a la izquierda, agenda centrada hasta 1152 px.

## Fuera de alcance

- La campanita y los avisos (006), "Te pedimos confirmar" y "Para decidir" (007), "Ahora" con Asistió / Faltó y
  "Hoy" (008), los beneficios y el precio con descuento (009), los números arriba de la agenda (011).
- "Mis turnos" con el historial y "Su último corte fue hace…": cuando haya historial de asistencias (008).
- La página pública de horarios y el ingreso (sin sesión): no cambian.

## Criterios de finalización

- Cliente y Colo navegan con la barra inferior en el celular y el riel en la computadora.
- Inicio, Reservar y Perfil como en el prototipo, con los datos reales.
- e2e de las specs 002 a 004b en verde con la forma nueva; capturas a 360 px y 1440 px, claro y oscuro.

## Dudas abiertas

Ninguna.
