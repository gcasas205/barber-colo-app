# Constitución — barber-colo

Principios innegociables. Toda spec, plan y tarea debe cumplirlos.

1. **La spec manda**: nada se implementa si no está en la spec activa. Si falta una decisión, se para y se pregunta.
2. **Stack fijo**: Next.js (App Router) con TypeScript estricto y Tailwind, Supabase (Postgres, Auth con Google, Cron) y despliegue en Vercel. Cualquier dependencia nueva se justifica en el plan.
3. **Lógica pura y separada**: disponibilidad, plazos, faltas, beneficios y precios son funciones puras en TypeScript (`src/domain`) que reciben "ahora" como parámetro, sin acceso a la base de datos ni a la interfaz.
4. **Tests como puerta**: la lógica se prueba con Vitest antes de escribir el código. Prohibido avanzar con tests en rojo o con errores de tipos; `npm run check` debe pasar en local y en CI.
5. **La base de datos protege las reglas críticas**: la unicidad de turnos se garantiza con restricciones en Postgres, y el acceso a los datos con Row Level Security. La interfaz nunca es la única validación.
6. **Fechas en la hora del local**: todo se calcula en `America/Argentina/Buenos_Aires` con una librería de zonas horarias; se guarda como `timestamptz`. Nunca se suman milisegundos para cambiar de día.
7. **Montos exactos**: precios en centavos (enteros) y precio base congelado en cada turno.
8. **Datos mínimos**: solo nombre, email, teléfono e historial; borrado a pedido; nada sensible en logs ni en las páginas de enlace.
9. **Mobile-first**: cada pantalla se diseña primero para 360 px y se verifica en la vista móvil.
10. **Idioma**: código en inglés; interfaz y documentación en español rioplatense.
