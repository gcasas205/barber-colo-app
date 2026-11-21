---
name: El Colo
description: Turnos online de la Barbería y Peluquería El Colo — la chapa del barrio
colors:
  blanco-porcelana: "#f3f5f4"
  chapa-blanca: "#ffffff"
  linea: "#d5dbe3"
  esmalte-noche: "#0e1729"
  esmalte-profundo: "#15223d"
  esmalte-azul: "#1d2f52"
  esmalte-claro: "#2a4170"
  esmalte-niebla: "#c9d3e6"
  esmalte-velo: "#e6ebf4"
  tinta: "#15223d"
  tinta-suave: "#47536b"
  sobre-esmalte: "#f3f5f4"
  sobre-esmalte-suave: "#b9c4da"
  rojo-poste: "#b8262f"
  rojo-poste-profundo: "#951d25"
  rojo-poste-velo: "#f9e3e4"
  verde-farmacia: "#1d6b45"
  verde-farmacia-velo: "#e2f1e8"
  ambar-espera: "#8a5a00"
  ambar-espera-velo: "#fbf0d9"
  gris-neutro: "#5b6577"
  gris-neutro-velo: "#eceff3"
typography:
  cifra-display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 108"
  headline:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.45
  body-small:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  letras-chapa:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 118"
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1
rounded:
  tally: "3px"
  control: "12px"
  chapa: "14px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "7": "28px"
  "8": "32px"
  "10": "40px"
components:
  button-principal:
    backgroundColor: "{colors.rojo-poste}"
    textColor: "{colors.chapa-blanca}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "52px"
  button-principal-hover:
    backgroundColor: "{colors.rojo-poste-profundo}"
  button-esmalte:
    backgroundColor: "{colors.esmalte-azul}"
    textColor: "{colors.sobre-esmalte}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "52px"
  button-esmalte-hover:
    backgroundColor: "{colors.esmalte-claro}"
  button-secundario:
    backgroundColor: "{colors.chapa-blanca}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "52px"
  chapa-esmalte:
    backgroundColor: "{colors.esmalte-azul}"
    textColor: "{colors.sobre-esmalte}"
    rounded: "{rounded.chapa}"
    padding: "20px"
  chapa-blanca:
    backgroundColor: "{colors.chapa-blanca}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.chapa}"
    padding: "16px 20px"
  horario:
    backgroundColor: "{colors.chapa-blanca}"
    textColor: "{colors.tinta}"
    typography: "{typography.cifra-display}"
    rounded: "{rounded.control}"
    height: "56px"
  horario-elegido:
    backgroundColor: "{colors.esmalte-azul}"
    textColor: "{colors.sobre-esmalte}"
  estado-confirmado:
    backgroundColor: "{colors.verde-farmacia-velo}"
    textColor: "{colors.verde-farmacia}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  estado-espera:
    backgroundColor: "{colors.ambar-espera-velo}"
    textColor: "{colors.ambar-espera}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  estado-alerta:
    backgroundColor: "{colors.rojo-poste-velo}"
    textColor: "{colors.rojo-poste}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  navegacion:
    backgroundColor: "{colors.esmalte-azul}"
    textColor: "{colors.sobre-esmalte-suave}"
    height: "64px"
---

# Design System: El Colo

## Overview

**Creative North Star: "La chapa del barrio"**

La app es la cartelería esmaltada de la Barbería y Peluquería El Colo. Toma los carteles de chapa
enlozada de los comercios de barrio y los pinta con los colores del poste de barbero que ya tiene el
logo: azul esmalte, rojo poste y blanco porcelana. Cada parte importante de una pantalla es una chapa;
el contenido corriente va en chapas blancas sobre un fondo porcelana frío.

Es una herramienta de todos los días, para clientes de 15 a más de 65 años y para un barbero que la
usa con una mano entre corte y corte. Por eso el mundo aporta solo cuatro cosas, tipografía, color,
densidad y un gesto, y nunca la navegación ni los controles, que son los de cualquier app. Letras
grandes, objetivos táctiles de 52 px o más, pocas palabras y cifras a la vista.

Se rechazan dos extremos que el dueño marcó: la app de turnos genérica (tarjetas blancas con un acento
azul cualquiera) y la barbería vintage disfrazada (madera, pergamino, bigotes por todos lados). El
logo aparece donde corresponde a una marca: arriba, en el riel y en la carga.

**Key Characteristics:**
- Chapas azul esmalte con la línea clara de borde interior de los carteles.
- Tres voces de color que no se mezclan: esmalte (marca y estructura), rojo poste (acción principal), estados.
- Letras de chapa: grotesca ensanchada en mayúsculas espaciadas; cifras tabulares para horarios y montos.
- Texto en una letra diseñada para baja visión, a 17 px.
- Un solo gesto: el poste de barbero que gira.

## Colors

Una paleta de cartel esmaltado: un azul profundo que estructura, un rojo que se gana su lugar y un blanco frío.

### Primary
- **Esmalte azul** (#1d2f52): chapas importantes (próximo turno, "Ahora"), chapa superior, riel lateral, barra inferior y toda selección (día, horario, persona).
- **Esmalte claro** (#2a4170): hover de los controles en esmalte.
- **Esmalte niebla / velo** (#c9d3e6 / #e6ebf4): selección de texto, casilleros vacíos de los beneficios, fondo del selector de persona.

### Secondary
- **Rojo poste** (#b8262f): la acción principal de la pantalla (Reservar turno, Asistió), el anillo de foco, el contador de avisos y las rayas del poste. Hover: **Rojo poste profundo** (#951d25).

### Tertiary (estados)
- **Verde farmacia** (#1d6b45 sobre #e2f1e8): confirmado, asistió.
- **Ámbar espera** (#8a5a00 sobre #fbf0d9): sin confirmar, por aprobar.
- **Rojo poste** (#b8262f sobre #f9e3e4): faltó, canceló tarde.
- **Gris neutro** (#5b6577 sobre #eceff3): reservado, cancelado.

### Neutral
- **Blanco porcelana** (#f3f5f4): fondo de toda la app. Frío, nunca crema.
- **Chapa blanca** (#ffffff): superficies de contenido.
- **Línea** (#d5dbe3): divisiones entre filas y borde de controles secundarios.
- **Tinta** (#15223d) y **tinta suave** (#47536b, 7:1 sobre porcelana): texto principal y secundario.
- **Sobre esmalte** (#f3f5f4) y **sobre esmalte suave** (#b9c4da, 7,6:1): texto sobre chapas azules.

En modo oscuro el fondo pasa a #0b1220, las chapas blancas a #131d31 y el rojo poste a #c03a43 (5,35:1 con texto blanco). La estructura no cambia.

### Named Rules
**La regla de las tres voces.** El esmalte es la marca y la estructura; el rojo poste es la única acción principal de cada pantalla; los colores de estado aparecen solo cuando el dato es un estado. Nunca se intercambian.

**La regla del estado con nombre.** Un estado se muestra siempre con color, ícono y palabra. El color solo no alcanza: hay daltónicos, mayores y pantallas al sol.

## Typography

**Display Font:** Archivo Variable (grotesca de ancho variable, autoalojada), con ui-sans-serif.
**Body Font:** Atkinson Hyperlegible Next Variable (autoalojada), con ui-sans-serif.

**Character:** La grotesca ensanchada habla como el letrero pintado de la chapa; la Atkinson, diseñada para baja visión, hace que un cliente de 65 años lea sin esfuerzo.

### Hierarchy
- **Cifra display** (Archivo 750, ancho 108 %, 40 px, interlineado 1, cifras tabulares): el horario del próximo turno; 34 px para "Ahora"; 21 a 26 px en horarios y días.
- **Headline** (Atkinson 700, 28 px, 1,25): saludo y título de pantalla.
- **Title** (Atkinson 700, 20 px, 1,3): títulos de sección y de grupos de formulario.
- **Body** (Atkinson 400, 17 px, 1,45): todo el texto corrido. Nunca por debajo de 15 px.
- **Letras de chapa** (Archivo 800, ancho 118 %, mayúsculas, espaciado 0,06 em, 17 a 20 px): solo el título de la chapa superior, el nombre en el riel y los días de la semana (13 px).
- **Label** (Atkinson 700, 14 px): etiquetas de estado.

### Named Rules
**La regla de la letra de chapa.** Las mayúsculas ensanchadas son para rotular, como un cartel: títulos de la chapa superior y nombres cortos. Nunca para párrafos ni para encabezados de sección.

## Layout

- **Celular primero:** una columna con 16 px de margen, secciones separadas por 28 px y títulos con más aire arriba que abajo.
- **Web (≥ 1024 px):** riel lateral de esmalte de 248 px con la insignia, el nombre y las secciones, y el contenido en un contenedor de hasta 1152 px con 32 px de margen, repartido en dos columnas según la pantalla:
  - barbero: "Ahora" y "Para decidir" | la fila del día;
  - reservar: formulario | resumen fijo de 360 px;
  - inicio del cliente: turno | beneficios.
- **Grillas de horarios:** 3 columnas en el celular, 4 desde 640 px y 5 desde 1280 px.
- **Barra inferior** de 64 px en el celular, con el área segura del sistema; en web la reemplaza el riel.
- **Ritmo de 4 px:** 4, 8, 12, 16, 20, 28, 32 y 40.

## Elevation & Depth

Profundidad mínima y física, como una chapa apoyada sobre una pared: sombras suaves con desplazamiento hacia abajo, sin halos de color y sin relieves falsos.

### Shadow Vocabulary
- **Chapa** (`inset 0 0 0 5px var(--esmalte-800), inset 0 0 0 7px rgb(243 245 244 / 0.3), 0 8px 18px -8px rgb(14 23 41 / 0.45)`): chapas de esmalte grandes. Dibuja la línea clara de borde interior a 5 px del canto.
- **Chapa control** (`inset 0 1px 0 rgb(255 255 255 / 0.14), 0 6px 14px -8px rgb(14 23 41 / 0.5)`): botones en esmalte y elementos elegidos.
- **Chapa clara** (`0 0 0 1px var(--linea) inset, 0 6px 14px -10px rgb(14 23 41 / 0.35)`): chapas blancas de contenido.

### Named Rules
**La regla de la línea interior.** La línea clara de borde interior es la firma del cartel esmaltado y va solo en las chapas grandes de esmalte. Los controles chicos no la llevan.

## Shapes

Esquinas redondeadas de cartel: 14 px en chapas, 12 px en controles y pastillas solo en las etiquetas de estado. Los casilleros de beneficios son rectángulos de 3 px, como marcas de una tarjeta de fidelidad. La insignia circular de El Colo es la única forma redonda grande.

## Components

### Buttons
- **Shape:** 12 px; alto mínimo de 52 px (56 en la acción principal de una pantalla).
- **Principal (rojo poste):** texto blanco en negrita, sombra suave roja hacia abajo. Uno solo por pantalla.
- **Esmalte:** para decisiones afirmativas que no son la acción principal (Mantener, Aprobar).
- **Secundario:** chapa blanca con borde interior de 2 px en línea (Liberar, Rechazar, Cambiar horario).
- **Texto:** subrayado de 2 px a 4 px de distancia (Cancelar).
- **Hover / Focus / Active:** se oscurece el fondo en 150 ms; foco con anillo de 3 px en rojo poste a 3 px de distancia; al tocar, escala 0,98.

### Chips de estado
- **Style:** pastilla con fondo velo del estado, ícono de 15 px con trazo 2,75 y la palabra en Label. No se parte en dos renglones.

### Cards / Containers (chapas)
- **Corner Style:** 14 px.
- **Background:** esmalte azul para lo importante; chapa blanca para el contenido.
- **Shadow Strategy:** chapa o chapa clara (ver Elevation).
- **Internal Padding:** 20 px; filas de lista de 72 px de alto con 20 px a los lados, separadas por una línea.

### Inputs / selección
- **Campos de texto, monto y lista:** chapa blanca de 52 px, borde interior de 2 px en línea, 12 px de radio y texto de 17 px; con foco, el borde pasa a esmalte y aparece el anillo rojo poste. Etiqueta en negrita de 15 px arriba y ayuda de 14 px abajo. Los montos llevan "$" fijo a la izquierda y cifras tabulares.
- **Interruptores:** checkbox nativo con forma de interruptor de 56 × 32 px; encendido en esmalte azul, apagado en esmalte velo con borde. Siempre con su texto y, si hace falta, una línea que explica qué pasa al apagarlo.
- Radios estándar ocultos visualmente dentro de etiquetas grandes: días (78 px de ancho con barra de ocupación y "N libres"), horarios (56 px, cifra de 21 px) y persona (control segmentado sobre esmalte velo). Lo elegido pasa a esmalte azul. Foco visible en rojo poste.

### Navigation
- **Celular:** barra inferior de esmalte con ícono de 22 px y etiqueta de 13 px; la sección actual en blanco porcelana con una pastilla clara detrás del ícono.
- **Web:** riel lateral de esmalte; la sección actual con fondo claro translúcido y borde fino.
- **Chapa superior:** insignia de 40 px (solo en el celular), título en letras de chapa y avisos con contador rojo.

### El poste (componente distintivo)
- Rayas diagonales rojo, blanco y azul que avanzan en 1,6 s, como un poste de barbero girando. Solo en tres lugares: la carga (el borde del logo gira y el bigote hace un tic cada 2,4 s), la confirmación de una reserva y el turno "Ahora" del barbero. Con movimiento reducido queda quieto.

### Beneficios (casilleros)
- Una casilla por corte necesario; las hechas en esmalte, las que faltan en esmalte velo con borde. Se leen también como texto ("3 de 4").

## Do's and Don'ts

### Do:
- **Do** usar el rojo poste (#b8262f) en una sola acción principal por pantalla.
- **Do** mostrar cada estado con color, ícono y palabra.
- **Do** escribir horarios y montos con la cifra tabular de Archivo.
- **Do** mantener todo objetivo táctil en 52 px o más, y el texto corrido en 17 px.
- **Do** reservar la línea interior para las chapas grandes de esmalte.
- **Do** usar el poste solo en la carga, la confirmación y "Ahora", y apagarlo con movimiento reducido.

### Don't:
- **Don't** usar madera, pergamino, tipografías de época ni bigotes como ornamento: el logo es el único bigote.
- **Don't** pasar el fondo a crema: el blanco porcelana es frío (#f3f5f4).
- **Don't** rotular párrafos ni secciones en letras de chapa.
- **Don't** usar el rojo poste como decoración ni en dos botones de la misma pantalla.
- **Don't** imitar relieve, chapa abollada ni brillo metálico con CSS.
- **Don't** usar rótulos chicos encima de los títulos ni mosaicos de "número grande con etiqueta" como estructura.
