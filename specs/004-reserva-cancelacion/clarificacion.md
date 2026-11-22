# Clarificación — Spec 004: Reservar, cancelar y reprogramar

Revisión como QA del borrador (2026-11-22). Gonzalo pidió la spec completa ("sigue con la spec 4 completa"):
las resoluciones se anexan y quedan en el plan.

## Ambigüedades, contradicciones y casos no cubiertos

1. **RF-7, "los guarda junto con la reserva".** Si el horario se ocupa justo después de cargar los datos,
   ¿se pierden los datos?
2. **RF-8 y turnos pasados.** Sin la spec 008 nadie marca asistencia: los turnos pasados quedan Reservado o
   Confirmado para siempre. ¿Cuentan para "un turno futuro activo" (RF-10) y para ocupar horarios?
3. **RF-10 desde varias pestañas** (caso 13): la regla "uno por cliente" no se puede expresar como índice
   en la base, porque depende de "ahora".
4. **RF-12 y Ajustes a la vez.** Una reserva y un bloqueo que se guardan en el mismo instante.
5. **RF-20.** ¿Qué se muestra si Colo canceló y después el cliente reservó otro turno?
6. **RF-23.** "Nuevo desde la última visita" con dos dispositivos de Colo abiertos.
7. **RF-25.** ¿Colo puede mover un turno a un horario pasado o fuera de las franjas?
8. **RF-27.** ¿Y si Colo cambia el paso y un turno ya no coincide con el paso nuevo?
9. **RF-4.** Hoy el invitado se crea al entrar (con nombre y celular). Con un toque, ¿qué queda guardado y
   cuándo se aplica el límite de intentos?
10. **RF-31.** Las sesiones anónimas de Supabase viven en `auth.users`: la app no tiene permiso para borrarlas.
11. **Cambio de entrada (RF-1 a RF-3) contra la spec 001.** La 001 define la página pública de horarios sin
    sesión (RF-1 de la 001). Esta spec la reemplaza.

## Resoluciones (2026-11-22)

1. Los datos se guardan primero (perfil o invitado), en su propia operación; después se intenta la
   reserva. Si el horario se ocupó, los datos quedan y el cliente elige otro horario sin volver a cargarlos.
2. Un turno cuenta como futuro mientras no terminó (fin > ahora). Los pasados siguen ocupando su horario
   (ya pasó, no molesta) y no frenan una reserva nueva. La 008 los cierra.
3. Se bloquea la fila del cliente (`for update`) dentro de la transacción de la reserva: dos pestañas se
   ordenan y la segunda ve el turno de la primera.
4. La reserva bloquea la fila de ajustes **en modo compartido** (`for share`) y Ajustes en modo exclusivo:
   las reservas no se esperan entre sí, pero un cambio de Ajustes espera a las reservas en curso y viceversa.
   La superposición entre turnos la garantiza además una restricción de exclusión en la base (RNF-2).
5. El aviso de RF-20 se muestra aunque haya un turno nuevo, hasta que el cliente lo cierra.
6. "Visto" se guarda por cuenta de barbero, no por dispositivo: lo que vio en uno deja de ser nuevo en el otro.
7. No: el horario nuevo tiene que estar dentro de las franjas, sin bloqueos ni otros turnos, y no en el
   pasado. Solo se saltean la anticipación mínima y la ventana de reserva.
8. El cambio de paso no toca turnos ya reservados (siguen en su horario). Los horarios libres nuevos se
   calculan con el paso nuevo, alrededor de esos turnos.
9. "Entrar como invitado" solo crea la sesión anónima, con el mismo límite de 5 por hora por conexión. El
   cliente invitado (nombre y celular) se crea al reservar por primera vez, con las reglas de la 002.
10. La limpieza diaria (pg_cron, como dueño de la base) borra los usuarios anónimos de más de 60 días sin
    actividad y sin cliente asociado. La app sigue sin permisos sobre `auth`.
11. Se reemplaza RF-1 de la 001: la página de horarios pasa a `/turnos`, con sesión. La dirección principal
    es el ingreso. La foto de la agenda y el cálculo en el dispositivo siguen iguales.
