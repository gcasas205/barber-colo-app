# Revisión final de impeccable — chapa enlozada

Fecha: 2026-11-20 · Construcción guiada por código (sin comps; sin generación de imágenes en esta sesión)
Revisión hecha en línea: el revisor de impeccable no puede lanzarse como agente aparte en este entorno.
Evidencia: `.impeccable/review/desktop.png`, `mobile.png` (hoy del barbero), `user-mobile-cliente.png`, `user-mobile-reservar.png`.

disposition: fix

## persistence
pass — `PRODUCT.md` existe; contrato de dirección en `.impeccable/surfaces/src-app.md` con `seed:282b69360d0c4c4e` (verificado con `--check-seed`); build guiado por código, sin ronda de comps.

## fidelity
- TYPE — match: letras de chapa en grotesca ensanchada (Archivo, 118 %) en mayúsculas espaciadas; cifras tabulares; texto en Atkinson Hyperlegible Next. Coincide con OWN-WORLD.
- MATERIAL — adaptation: chapas planas sin imitar relieve ni esmalte (correcto: nada de biseles falsos), pero el **borde interior claro** que OWN-WORLD promete casi no se ve (blanco al 10 %); el esmalte no se lee como cartel.
- GROUND — match: blanco porcelana frío `#f3f5f4`, sin deriva al crema.
- Inicio del cliente, título de la chapa superior — contradicted: el contrato dice "EL COLO" y la construcción muestra "INICIO" sin una decisión que lo justifique.
- Tira de días — adaptation: 6 días en lugar de 7, por el horario publicado (lunes a sábado, `PRODUCT.md`).
- Pendientes del barbero — adaptation: tarjetas con sus dos botones en lugar de chips, por el principio "un toque para lo urgente" (`PRODUCT.md`).
- Riel lateral en web — added (aprobado por el usuario en esta sesión).

## ceiling
El mundo del cartel esmaltado tiene un recurso sin usar: la **línea de borde interior** de las chapas, que es su firma gráfica. El poste se usa con la medida justa (carga, confirmación, "ahora").

## material_fixes
1. Contraste del botón rojo en modo oscuro: blanco sobre `#d8434c` da 4,35:1, por debajo de 4,5:1 para texto de 17 px. Oscurecer el rojo de ese modo.
2. Restituir "EL COLO" como título de la chapa superior en el inicio del cliente en el celular (en web el riel ya lleva la marca y el título puede ser "Inicio").
3. Hacer visible el borde interior de las chapas de esmalte: una línea clara inset, como en los carteles, sin relieve falso.
4. Las cifras del encabezado del barbero repiten la plantilla de "número grande con etiqueta en tarjetas" que el piso de calidad rechaza por defecto: pasarlas a una línea de cifras dentro de la chapa, sin mosaicos.

## keep
El poste solo en carga, confirmación y "ahora"; el rojo solo en la acción principal; estados siempre con ícono y palabra.

---

## Verificación (sobre las mismas capturas, rehechas)

### verdict
1. Contraste del rojo en modo oscuro — resolved: el rojo pasa a `#c03a43` (5,35:1 con blanco); "Reservar turno" se lee en `user-mobile-cliente-oscuro.png`.
2. Título "EL COLO" en el inicio del cliente — resolved: la chapa superior dice "EL COLO" en el celular y "Inicio" en web, donde el riel lleva la marca.
3. Borde interior de las chapas — resolved: la línea clara a 5 px del canto se ve en "Tu próximo turno" y en "Ahora", en claro y en oscuro.
4. Cifras del barbero en mosaicos — resolved: una línea de cifras ("9 turnos · $ 34.800 cobrado de $ 91.800") dentro de la chapa.

Regresiones: ninguna material. En "Ahora", la banda del poste tapa el tramo superior de la línea interior; se lee como el encabezado del cartel y queda así.

### remaining
clear

disposition: ship (cubre las cuatro correcciones; el resto de la app se revisa en cada spec)
