# Diseño 4 — Interfaz

Estado: en construcción
Parte de: Diseño → 1. Arquitectura ✅ · 2. Base de datos ✅ · 3. Backend ✅ · **4. Interfaz**
Entrada: [`PRODUCT.md`](../../PRODUCT.md) · Método: skill `impeccable`

> La dirección visual completa (mundo visual, tipografía, color, componentes y pantallas) se agrega
> en las próximas rondas con impeccable. Esta sección registra las decisiones ya tomadas.

---

## UI-01. Pantalla de carga con el logo ✅

**Pedido:** usar el logo de El Colo en los momentos de carga, como hace Corralap.

**Decisión:** el **borde de poste de barbero del logo gira** y **el bigote se mueve** una vez por vuelta, como el cartel giratorio de la puerta
de una barbería, mientras el resto del centro ("BARBERIA", "EL COLO") queda quieto. Es la misma idea que
Corralap, donde una parte del logo se anima en lugar de usar un indicador genérico, pero con el
elemento más reconocible de este logo.

| Aspecto | Definición |
|---|---|
| Archivos | `public/brand/loader-el-colo.svg` (claro) y `public/brand/loader-el-colo-oscuro.svg` (oscuro). SVG autónomos con su animación CSS adentro |
| Movimiento | Rotación continua del borde, una vuelta cada 2,4 s, velocidad constante. Entrada de 320 ms (aparece y escala de 94 % a 100 %) |
| Bigote | Una vez por vuelta hace un "tic": se tuerce a un lado (−6°), al otro (+5°) y vuelve, con un leve estiramiento, en el último tercio de la vuelta (entre el 62 % y el 92 %). El resto del tiempo queda quieto, para no competir con el giro |
| Movimiento reducido | Con `prefers-reduced-motion` el logo queda quieto, borde y bigote incluidos (constitución y `PRODUCT.md`) |
| Tamaño | 132 px en pantalla completa; nunca menos de 96 px (debajo de eso el texto del logo no se lee) |
| Texto | Debajo del logo, una línea corta según el contexto: "Cargando tus turnos…", "Cargando la agenda…". Siempre presente para lectores de pantalla (`role="status"`, `aria-live="polite"`) |
| Tema | Versión clara sobre fondo crema; oscura sobre fondo oscuro |

![Vista previa de la pantalla de carga, clara y oscura](assets/loader-preview.gif)

**Dónde se usa:**
- `app/loading.tsx` y los `loading.tsx` de cada sección (cambio de pantalla).
- La vuelta del login con Google (`auth/callback`) mientras se crea o carga el cliente.
- El primer arranque de la app instalada, mientras se carga la sesión.

**Dónde no se usa:** cargas chicas dentro de una pantalla (un botón que guarda, una lista que se
actualiza). Ahí van indicadores livianos (el botón en estado "guardando", esqueletos de la lista),
para no tapar la pantalla con el logo cada vez.

**Implementación:** un componente `BrandLoader` en `src/ui/brand/` que inserta el SVG en la página
(no como `<img>`, para que tome el tema y la accesibilidad del componente). Entra con la primera spec
que tenga interfaz.

**Pendiente con la tipografía:** el texto del logo usa una slab de sistema como aproximación. Cuando
se elija la tipografía de la app, los textos del logo se pasan a trazos para que se vea igual en
todos los celulares.
