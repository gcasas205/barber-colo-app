---
description: SDD · Entrevista y genera la spec (uso - /sdd-spec 001-nombre idea inicial)
argument-hint: <NNN-nombre> <idea inicial>
---
NO escribas código en ningún momento. Usá la skill sdd. Leé docs/constitution.md, docs/analisis.md y MEMORY.md.

Carpeta de la spec: specs/$1/
Idea inicial (el texto que va después del nombre de la carpeta): $ARGUMENTS

Tu trabajo:
1. Buscá en docs/analisis.md las reglas (RN-x) y requisitos (RF-x, RNF-x) que corresponden a esta spec según la tabla del backlog.
2. Hacéme preguntas de UNA en UNA para eliminar ambigüedades (casos límite, errores, qué queda fuera de esta versión). Máximo 5. No preguntes lo que ya está decidido en el análisis.
3. Con mis respuestas, generá specs/$1/spec.md con la plantilla de la skill sdd, los requisitos en EARS, el origen (ids del análisis) y "Estado: borrador".
4. Solo el QUÉ y el POR QUÉ: nada de stack, arquitectura ni nombres de archivos.
