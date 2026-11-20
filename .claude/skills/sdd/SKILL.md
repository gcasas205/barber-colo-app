---
name: sdd
description: Usala siempre que trabajes con Spec-Driven Development en barber-colo (docs/constitution.md, docs/analisis.md o cualquier archivo dentro de specs/) - redactar, revisar o cambiar specs, planes y tareas, o implementar y validar tareas de una spec.
---

# Spec-Driven Development (SDD) — barber-colo

## Flujo
Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio.

- Nunca pases a la siguiente fase sin la aprobación explícita del usuario.
- La spec manda: si algo no está en la spec, no se implementa. Si falta una decisión, pará y preguntá.
- Un cambio de requisitos se hace primero en la spec, después en el plan y las tareas, y por último en el código.
- Cada spec vive en `specs/NNN-nombre/` con `spec.md`, `plan.md` y `tasks.md`, y se trabaja en la rama `spec/NNN-nombre`.
- Los RF y RN de `docs/analisis.md` son el punto de partida: citá sus ids (RN-x, RF-x) en la spec para mantener la trazabilidad.
- Al terminar cada fase, actualizá `MEMORY.md`.

## Plantilla de spec (spec.md)
```
# Spec NNN — <Nombre>

Estado: borrador | aprobada | implementada
Origen: docs/analisis.md (RN-x, RF-x, RNF-x)

## Contexto y objetivo
## Usuarios
## Historias de usuario
- HU-1. Como <rol>, quiero <acción> para <beneficio>.
## Definiciones (solo si hay términos que puedan interpretarse de varias formas)
## Requisitos funcionales
## Requisitos no funcionales
## Casos límite
## Fuera de alcance
## Criterios de finalización
## Dudas abiertas
- [NECESITA ACLARACIÓN] <duda>
```
La spec describe el QUÉ y el POR QUÉ. Nada de stack, arquitectura ni nombres de archivos.

## Requisitos en EARS (en español)
- RF-x: CUANDO <evento>, EL SISTEMA <respuesta>.
- RF-x: SI <condición no deseada>, ENTONCES EL SISTEMA <respuesta>.
- RF-x: MIENTRAS <estado>, EL SISTEMA <respuesta>.
- RF-x: EL SISTEMA <comportamiento permanente>.

Cada RF debe ser verificable con un test o con una verificación manual concreta. Nada de "rápido" o "fácil" sin un criterio medible. Los plazos (4 h, 1 h, 30 min, 10 min) se escriben con su valor y se aclara si es configurable.

## Plan (plan.md)
Solo con la spec aprobada y sin dudas abiertas; si no, pará y avisá. No escribas código. Incluí:
- Archivos que se crean o modifican y la responsabilidad de cada uno.
- Funciones puras de `src/domain` (con "ahora" como parámetro) y su firma en TypeScript.
- Cambios en la base: tablas, restricciones, índices y políticas RLS (migraciones de Supabase).
- Tareas programadas (Supabase Cron) si hacen falta, y cómo se prueban.
- Algoritmo en pseudocódigo para la lógica no trivial.
- Interfaz: pantallas y estados (vacío, cargando, error), primero en 360 px.
- Decisiones técnicas justificadas, con su alternativa descartada.
- Estrategia de tests con Vitest, incluidos los casos límite de fechas (skill `fechas-locales`).
- Qué RF cubre cada parte.

## Tareas (tasks.md)
```
- [ ] **Tn. [agente|persona] <Descripción>.** RF-x, RF-y
  - Hecho cuando: <comprobación verificable>.
```
Máximo 20-30 min por tarea, en orden de dependencia. `[agente]`: cambios en el repo. `[persona]`: acciones en los paneles de Supabase, Vercel o GitHub. Si salen más de 10, proponé dividir la spec.

## Implementación
Una sola tarea por vez.
- Tarea `[agente]`: tests primero (en rojo) para la lógica, después el código, `npm run check` en verde, marcar la tarea y parar.
- Tarea `[persona]`: no la ejecutes. Escribí el instructivo exacto (pantalla, valores a cargar) y la evidencia que necesitás de vuelta. Marcala hecha solo cuando el usuario traiga esa evidencia.
- Nunca uses `--no-verify` ni desactives un check para avanzar.

## Validación
Recorré la spec RF por RF: qué test lo cubre y su resultado, o qué verificación manual lo demuestra (incluida la vista móvil). Si un RF no está cubierto o falla, decilo. No arregles nada. Comprobá los criterios de finalización y la constitución, y dá un veredicto: ¿la spec está cumplida?

## Cambio
No toques código. Actualizá `spec.md` (RF nuevo o modificado en EARS, casos límite, fuera de alcance), indicá qué partes de `plan.md` y `tasks.md` cambiarían, mostrá el diff y esperá aprobación. Si el cambio contradice `docs/analisis.md`, actualizalo también.

## Estado
Sin modificar archivos: fase actual de la spec, tareas hechas y pendientes (x de y, separando `[persona]`) y el siguiente paso exacto con su comando `/sdd-*`.
