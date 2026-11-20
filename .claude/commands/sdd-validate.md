---
description: SDD · Valida la spec RF por RF
argument-hint: <NNN-nombre>
---
Recorré specs/$1/spec.md requisito por requisito. Para cada RF indicá qué test lo cubre y el resultado de ejecutarlo con npm test. Los RF de interfaz que no se puedan testear así, verificalos levantando la app (npm run dev), incluida la vista móvil de 360 px, o indicá la verificación manual que falta.

Si algún RF no está cubierto o falla, decilo claramente. NO arregles nada todavía.

Después ejecutá npm run check, comprobá los criterios de finalización y la constitución, y dame un veredicto: ¿la spec está cumplida?
