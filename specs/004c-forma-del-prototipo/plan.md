# Plan — Spec 004c: La forma del prototipo en las pantallas reales

Sin cambios de esquema, de casos de uso ni de dependencias. Solo `src/app` y `src/ui`.

## Marco común (`src/app/_sesion/AppFrame.tsx`)
- Reemplaza a `SessionScreen` en las pantallas con sesión: franja de prueba, chapa superior con el nombre de la
  sección (RF-4), contenido y navegación. Celular: `BottomNav`; ≥ 1024 px: riel lateral (el de `src/ui/AppShell`,
  sin el enlace fijo a `/prototipo`). RF-1, RF-2.
- `NavLink` (cliente): el marcado instantáneo de `ColoTabs` (`useLinkStatus`, se limpia al ocultarse) pasa acá y lo
  usan la barra y el riel. `ColoTabs` desaparece. RF-3.
- Secciones: cliente `/turnos` (Inicio), `/reservar` (Reservar), `/perfil` (Mi perfil); Colo `/colo`,
  `/colo/clientes`, `/colo/ajustes`. Las direcciones actuales no cambian (los e2e y los enlaces guardados siguen).
- Contenido: celular a lo ancho con 16 px; computadora hasta 1152 px y dos columnas donde el diseño lo pide (RF-15).

## Reservar (`src/app/reservar/`, nueva)
- El selector (`Picker`, `Confirm`, `WhoPicker`) sale de `TurnosClient` a `reservar/ReservarClient.tsx`.
- "¿Para quién es?" como control segmentado (`src/ui/Segmented.tsx`, radios con la voz de selección). RF-9.
- Resumen fijo (`sticky bottom-[64px]` sobre la barra; en la computadora, columna "Tu reserva", como el prototipo).
  El nombre y el celular, si faltan, se piden en el resumen al tocar "Reservar". RF-10, RF-11.
- Cambiar horario: `/reservar?cambiar=<id>` (el turno se valida en el servidor: tiene que ser de la cuenta). RF-13.
- Al terminar, la acción llama a `revalidatePath("/turnos")` (así Inicio no sale del guardado de 30 s) y el cliente
  va a `/turnos?listo=<código>`; Inicio muestra el mensaje y limpia la dirección. RF-12.

## Inicio (`src/app/turnos/`)
- `InicioClient.tsx`: "Hola, <nombre>", aviso de Colo, una chapa de esmalte por turno (la `TurnoCard` actual, más
  grande, con "Tu próximo turno" o "Turno de <persona>"), personas sin turno y "Reservar turno". RF-5 a RF-8.

## Colo
- `/colo`, `/colo/clientes` y `/colo/ajustes` usan `AppFrame`; `ColoSignOut` queda al pie. RF-15.

## Tests
- Unitarios: `AppFrame`/`NavLink` (marca y `aria-current`), `Segmented`, `InicioClient` (casos 1 a 4, render).
- e2e: `pestanas.py` (barra inferior y riel), `turnos.py`, `a_cargo.py`, `login.py` y `ajustes.py` ajustados a la
  forma nueva; `speed_pestanas.py` (RNF-1); capturas a 360 y 1440 px, claro y oscuro (`tests/e2e/capturas.py`).

## Impacto en producción
- Mismas direcciones y reglas. Lo único que cambia para quien ya usa la app es dónde están los botones.
