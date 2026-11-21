---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/ui"]
---

# El Colo · App (cliente y barbero)

## Scope and mode

Toda la app en `src/app`: reserva y turnos del cliente, página del enlace de turno, inicio y agenda del barbero, clientes, indicadores y ajustes. Modo **Operate**. PWA en el celular; el cliente y el barbero comparten el mismo mundo.

## Audience, job, constraints

- Clientes de 15 a más de 65 años y padres que reservan para sus hijos: reservar, confirmar, cancelar o cambiar en pocos toques, sin letra chica.
- Colo, entre corte y corte, con una mano: ver quién sigue, decidir rápido (aprobar, mantener, liberar, marcar asistencia).
- Evitar: app de reservas genérica, barbería vintage disfrazada (madera, pergamino, bigotes por todos lados), tono frío o corporativo, cualquier cosa difícil para los mayores.
- Escena: de día, bajo la luz blanca del local y en la calle; tema claro por defecto y oscuro según el sistema.

## Chosen direction and memorable moment

Chapa enlozada: los carteles esmaltados del barrio en los colores del poste de barbero. Momento memorable: el poste que gira (carga, confirmación y el turno "ahora" del barbero).

## Unresolved decisions

- Tipografía definitiva del logo (la reproducción usa una slab aproximada).

## Direction contract

THESIS: La app es la cartelería esmaltada de El Colo: cada sección es una chapa de porcelana en los colores del poste. Rechaza la app de turnos de tarjetas blancas con acento azul y el disfraz vintage de madera y pergamino.

OWN-WORLD: Fondo blanco porcelana frío; chapas azul esmalte con borde interior claro y esquinas redondeadas, letras blancas en mayúsculas grotescas espaciadas; rojo poste solo para la acción principal y lo crítico; estados con marca propia además del color; un solo cartel invertido por pantalla (el próximo turno); controles estándar.

STORY: El cliente ve su próximo turno o "Reservar", elige un día que ya muestra qué tan lleno está, toca un horario y confirma en tres toques. Colo ve quién está ahora, quién sigue y qué tiene que decidir, y lo resuelve de un toque.

FIRST VIEWPORT: Cliente: chapa azul arriba con la insignia y "EL COLO"; debajo, el próximo turno en cartel invertido o el botón rojo "Reservar turno"; tira de 7 días con barra de ocupación; grilla de horarios en chapas blancas de 56 px; barra inferior Inicio · Reservar · Mis turnos · Perfil. Barbero: chapa "HOY · SÁB 21" con conteos; cartel "AHORA" con borde de poste girando; fila de turnos del día; chips de pendientes; barra inferior Hoy · Agenda · Clientes · Números · Ajustes.

FORM: Chapa enlozada, posición 1 de 7 en la lista ordenada (elegida como carta de impeccable sobre la sorteada), seed:282b69360d0c4c4e.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
