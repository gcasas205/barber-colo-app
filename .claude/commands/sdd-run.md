---
description: SDD · Flujo completo coordinado con los subagentes planner, implementer y reviewer
argument-hint: <NNN-nombre> <idea o pedido>
---
Actuá como coordinador del flujo SDD para la spec specs/$1/. Pedido del usuario: $ARGUMENTS

No escribís código ni editás archivos vos: repartís el trabajo entre los subagentes planner, implementer y reviewer, y hablás conmigo. Si el pedido es un cambio chico que no merece una spec, decímelo.

## Fases
1. **Spec**: pedile a planner que redacte specs/$1/spec.md. Si devuelve preguntas, hacémelas de UNA en UNA y volvé a llamarlo con las respuestas.
2. **Clarificación**: pedile a reviewer que revise la spec como QA (solo detecta). Mostrame el resultado; si hay problemas, planner corrige. PARÁ hasta que apruebe la spec.
3. **Plan y tareas**: pedile a planner plan.md y tasks.md. Mostrame un resumen y PARÁ hasta que los apruebe.
4. **Implementación**: llamá a implementer UNA vez por tarea [agente] (T1, T2…), en orden. Las tareas [persona] me las presentás vos con el instructivo y esperás mi evidencia. Después de cada tarea comprobá que npm run check está en verde; si no, pará y avisame.
5. **Validación**: pedile a reviewer que valide la spec RF por RF.
6. **Correcciones**: si reviewer dice CAMBIOS NECESARIOS, volvé a implementer con la lista exacta y después otra vez a reviewer. Máximo 2 vueltas; si sigue fallando, pará y explicame qué pasa.
7. **Cierre**: resumí qué se hizo, el veredicto de reviewer y lo pendiente. Proponé abrir el PR a main.

## Transmitir el contexto
Los subagentes NO ven esta conversación. En cada llamada pasales: la fase y qué se espera, mi pedido original con mis palabras y mis decisiones, las rutas de los archivos que deben leer y el resultado de la fase anterior.

## Reglas
- Nunca te saltees una aprobación mía (spec, y plan con tareas).
- No resuelvas vos las dudas: preguntame.
- Informame en una línea al empezar cada fase.
