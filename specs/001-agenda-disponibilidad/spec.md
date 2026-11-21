# Spec 001 — Agenda, servicios y horarios libres

Estado: borrador
Origen: `docs/analisis.md` (RN-01, RN-02, RN-04, RN-30, RN-35 a RN-39 · RF-04, RF-07, RF-08, RF-37, RF-41 a RF-44 · RNF-01, RNF-04, RNF-09, RNF-12, RNF-14), `docs/dominio.md` (D-10, I-8, I-9, I-16)
Diseño: `docs/diseno/` · Interfaz: `DESIGN.md`

## Contexto y objetivo

Toda la app depende de una pregunta: **¿en qué momentos se puede reservar cada servicio?** Hoy la
respuesta está en la cabeza de Colo y en su libreta. Esta spec define cómo se calcula a partir de su
horario de atención, los bloqueos y la duración de cada servicio, y la muestra en una página pública
para que cualquiera vea qué hay disponible sin escribir por WhatsApp.

Es la base de las reservas (spec 003): si los horarios libres se calculan mal, se reservan turnos
que no entran o se pierden turnos que sí entraban. Por eso es la parte con más reglas de fechas del
proyecto y va primero.

## Usuarios

- **Visitante:** cualquier persona, con o sin sesión iniciada (por ejemplo, alguien que entra desde el enlace del Instagram).
- **Barbero:** en esta spec no tiene pantallas; su configuración arranca con los valores iniciales de la sección "Definiciones" y la edita desde Ajustes a partir de la spec 002.

## Historias de usuario

- HU-1. Como visitante, quiero ver los servicios de El Colo con qué incluyen, cuánto duran y cuánto cuestan, para elegir qué hacerme.
- HU-2. Como visitante, quiero ver qué días tienen lugar para el servicio que elegí, para no recorrer días llenos.
- HU-3. Como visitante, quiero ver los horarios en los que puedo empezar ese servicio un día, para elegir el que me queda bien.
- HU-4. Como barbero, quiero que solo se ofrezcan horarios dentro de mis franjas de atención y fuera de mis bloqueos, para no recibir turnos cuando no estoy.

## Definiciones

- **Franja:** día de la semana con hora de apertura y cierre. Un día puede tener varias franjas (por ejemplo, 10 a 13 y 14 a 20).
- **Paso de la agenda:** cada cuántos minutos puede empezar un turno.
- **Bloqueo:** período de fecha y hora en el que no se atiende, aunque caiga dentro de una franja (un día entero, una mañana, una hora).
- **Ocupación:** período que la agenda no puede ofrecer porque ya está tomado. En esta spec no hay turnos todavía, así que la única ocupación son los bloqueos; desde la spec 003, los turnos activos también ocupan.
- **Horario libre (para un servicio):** inicio, múltiplo del paso, desde el cual el servicio entra completo dentro de una franja sin tocar ninguna ocupación, y que cumple la anticipación mínima y máxima.
- **Hoy:** el día calendario actual en la hora de Buenos Aires.
- **Ventana de reserva:** desde hoy hasta 30 días después de hoy, ambos incluidos.

**Configuración inicial** (la carga el sistema al arrancar; Colo la edita en la spec 002):

| Parámetro | Valor |
|---|---|
| Franjas | Lunes a sábado, de 10:00 a 13:00 y de 14:00 a 20:00 (**provisorio**, a confirmar por Colo). Domingo sin franjas |
| Paso de la agenda | 15 minutos |
| Anticipación mínima | 30 minutos |
| Anticipación máxima | 30 días |
| Servicios | **Corte**: "Corte de pelo", 30 min, $ 18.000, suma para beneficios · **Completo**: "Corte, barba y cejas", 30 min, $ 20.000, suma · **Claritos**: "Reflejos", 2 h, $ 70.000, no suma. En ese orden |
| Bloqueos | Ninguno |

## Requisitos funcionales

**Servicios**
- RF-1. EL SISTEMA muestra a cualquier visitante, sin pedirle que inicie sesión, los servicios que se pueden reservar, en el orden definido, cada uno con nombre, qué incluye, duración y precio.
- RF-2. SI un servicio está desactivado, ENTONCES EL SISTEMA no lo muestra ni calcula horarios para él.
- RF-3. EL SISTEMA muestra los precios en pesos, con separador de miles y sin decimales (por ejemplo, "$ 18.000"), y las duraciones en minutos o en horas ("30 min", "2 h", "1 h 30 min").

**Días con lugar**
- RF-4. CUANDO un visitante elige un servicio, EL SISTEMA muestra cada día de la ventana de reserva con la cantidad de horarios libres de ese servicio en ese día.
- RF-5. SI un día no tiene franjas, está bloqueado completo o no tiene ningún horario libre para el servicio elegido, ENTONCES EL SISTEMA lo muestra como "sin lugar" y no permite elegirlo.
- RF-6. CUANDO el día elegido no tiene lugar para el servicio, EL SISTEMA indica cuál es el próximo día de la ventana que sí tiene.

**Horarios libres**
- RF-7. CUANDO un visitante elige un servicio y un día con lugar, EL SISTEMA muestra los horarios libres de ese servicio en ese día, ordenados de más temprano a más tarde y agrupados en mañana (antes de las 14:00) y tarde.
- RF-8. EL SISTEMA ofrece un horario solo si el servicio **termina dentro de la misma franja** en la que empieza: un servicio que cruza el cierre del mediodía o el cierre del día no se ofrece. Terminar exactamente a la hora de cierre está permitido.
- RF-9. EL SISTEMA no ofrece ningún horario cuyo período (inicio a fin del servicio) se superponga con una ocupación. Un servicio puede empezar exactamente cuando termina una ocupación y terminar exactamente cuando empieza otra.
- RF-10. SI faltan menos de 30 minutos para el inicio de un horario, ENTONCES EL SISTEMA no lo ofrece. Con exactamente 30 minutos, sí lo ofrece.
- RF-11. SI un horario cae fuera de la ventana de reserva, ENTONCES EL SISTEMA no lo ofrece.

**Configuración**
- RF-12. EL SISTEMA rechaza una configuración de agenda en la que dos franjas de un mismo día se superponen, una franja cierra antes o a la misma hora en que abre, o el paso no divide la hora en partes iguales (5, 10, 15, 20, 30 o 60 minutos).
- RF-13. EL SISTEMA rechaza un servicio con precio menor o igual a cero, con duración que no es múltiplo del paso o con un nombre igual al de otro servicio activo.
- RF-14. EL SISTEMA rechaza un bloqueo cuyo fin no es posterior a su inicio.

## Requisitos no funcionales

- RNF-1. **Hora local:** días, franjas, "hoy", mañana y tarde se calculan en la hora de Buenos Aires, sea cual sea la zona del dispositivo o del servidor (RNF-04 del análisis).
- RNF-2. **Lógica verificable:** el cálculo de horarios libres recibe "ahora" como dato y se prueba con fechas fijas, incluidos los bordes de esta spec (constitución, principio 3).
- RNF-3. **Velocidad:** la página de horarios carga en menos de 2 segundos con 4G, y elegir otro servicio o día actualiza la lista en menos de 1 segundo.
- RNF-4. **Accesibilidad:** se puede recorrer con teclado y con lector de pantalla (servicio, día y horario son grupos de opciones con nombre); contraste AA; usable desde 360 px de ancho y en web (`DESIGN.md`).
- RNF-5. **Datos:** la configuración inicial queda guardada en la base, no escrita en el código de la página, para que la spec 002 la pueda editar.

## Casos límite

1. Un Claritos (2 h) en la franja de 10:00 a 13:00 puede empezar 10:00, 10:15, 10:30, 10:45 u 11:00; a las 11:15 ya no entra.
2. Un Corte de 30 min puede empezar a las 12:30 (termina 13:00) pero no a las 12:45.
3. Un bloqueo de 10:00 a 11:00: el primer Corte libre es a las 11:00.
4. Un bloqueo que cubre todo el día: el día aparece "sin lugar" para todos los servicios.
5. Un bloqueo de varios días (vacaciones del 1 al 7): ninguno de esos días tiene lugar.
6. Visita a las 19:40 de un martes: hoy no hay horarios (el último Corte empieza 19:30, y faltan menos de 30 min). El día se muestra "sin lugar".
7. Visita a las 09:45: el horario de las 10:15 se ofrece (30 min exactos); el de las 10:00 no.
8. Visita a las 23:50: "hoy" todavía es ese día hasta las 00:00 de Buenos Aires.
9. Último día de la ventana (hoy + 30): se ofrece completo; el día siguiente no aparece.
10. Un dispositivo configurado en otra zona horaria ve los mismos días y horarios que uno en Buenos Aires.
11. Domingo: aparece "sin lugar" para todos los servicios.
12. Un servicio desactivado no aparece aunque tenga horarios.

## Fuera de alcance

- Reservar un turno y que el turno ocupe la agenda (spec 003). La página muestra los horarios, pero todavía no tiene botón de reserva.
- Login e identificación de clientes (spec 002).
- Pantallas de Colo para editar franjas, paso, bloqueos y servicios (spec 002, con el login).
- Avisar a clientes con turnos dentro de un bloqueo nuevo (spec 003).
- Descuentos estimados en los precios (requieren saber quién es el cliente: spec 008).
- Feriados automáticos: Colo los bloquea a mano.
- Venta de productos (ceras).

## Criterios de finalización

- Todos los RF tienen al menos un test automático en verde, y los casos límite 1 a 12 están cubiertos.
- La configuración inicial está cargada en la base local y en la de Supabase del proyecto.
- La página pública muestra servicios, días y horarios, verificada en 360 px y en web, con teclado y en modo oscuro.
- `npm run check` y CI en verde; despliegue de prueba en Vercel funcionando.
- `MEMORY.md` actualizado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Las franjas iniciales (10 a 13 y 14 a 20) son provisorias: Colo las confirma o las corrige desde Ajustes cuando llegue la spec 002. No bloquea esta spec.
