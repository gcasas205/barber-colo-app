---
description: SDD · Implementa UNA tarea, tests primero (uso - /sdd-implement 001-nombre T3)
argument-hint: <NNN-nombre> <Tn>
---
Implementá SOLO la tarea $2 de specs/$1/tasks.md, siguiendo specs/$1/plan.md, docs/constitution.md y la skill sdd. Si toca fechas, usá la skill fechas-locales.

Asegurate de estar en la rama spec/$1 (creala desde main si no existe).

Si la tarea es [persona]: no la ejecutes; dame el instructivo exacto y la evidencia que necesitás.

Si es [agente]:
1. Escribí primero los tests y comprobá que fallan.
2. Escribí el código hasta que pasen.
3. Ejecutá npm run check y mostrame el resultado.
4. Marcá $2 como hecha en tasks.md, indicá qué RF cubre y hacé un commit con el mensaje "spec $1: $2 <descripción>".

Después PARÁ. No empieces la siguiente tarea. Nunca uses --no-verify.
