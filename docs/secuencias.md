# Diagramas de secuencia — barber-colo

Estado: borrador (pendiente de aprobación)
Modelo: [`docs/dominio.md`](dominio.md) · Casos de uso: [`docs/casos-de-uso.md`](casos-de-uso.md)

> Muestran cómo colaboran los **módulos del dominio** en los cuatro flujos más delicados. Son
> independientes de la tecnología: "Interfaz" es la app del celular y "Eventos" es el mecanismo que
> registra cada evento junto con el cambio que lo produce y lo entrega después (dominio, sección 7).
>
> Convención: flecha llena `->>` = consulta o comando síncrono; flecha abierta `-)` = evento asíncrono.

---

## S-1. Reservar turno (CU-02, CU-03)

Lo crítico: dos clientes que reservan el mismo horario al mismo tiempo, y la habilitación del cliente.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant UI as Interfaz
    participant T as Turnos
    participant A as Agenda
    participant K as Conducta
    participant P as Precios
    participant E as Eventos
    participant N as Notificaciones

    C->>UI: Elige un día
    UI->>T: horariosLibres(día)
    T->>A: horariosOfrecidos(día, ahora)
    A-->>T: horarios ofrecidos
    T->>T: freeSlots(ofrecidos, turnos activos)
    T->>P: tarifa vigente y descuento estimado(cliente, día)
    P-->>T: precio, descuento, precio final
    T-->>UI: horarios libres con precios
    UI-->>C: Muestra horarios

    C->>UI: Reserva 16:00
    UI->>T: reservar(cliente, 16:00)
    T->>K: habilitación(cliente)
    K-->>T: normal | requiere aprobación | bloqueado
    alt bloqueado
        T-->>UI: Rechazo: comunicate con el barbero
    else normal o requiere aprobación
        T->>A: ¿16:00 sigue ofrecido? (ahora)
        A-->>T: sí
        T->>P: tarifa vigente
        P-->>T: precio base
        T->>T: initialStatus(horario, ahora, habilitación)
        T->>T: Guardar turno + evento en una sola operación
        alt el horario ya tiene un turno activo (I-2) u otro turno futuro del cliente (I-3)
            T-->>UI: Error: el horario ya no está disponible
            UI-->>C: Vuelve a mostrar los horarios
        else guardado
            T-->>UI: Turno Reservado / Confirmado / PendienteAprobación
            UI-->>C: Turno reservado
            T-)E: AppointmentBooked (o ApprovalRequested)
            E-)N: Aviso al barbero
        end
    end
```

**Por qué así:** la unicidad del horario (I-2) se garantiza en el momento de guardar, no en el paso 3.
Entre que el cliente ve el horario libre y lo reserva, otro puede haberlo tomado: el sistema lo detecta
al guardar y responde con un error claro, nunca con una doble reserva.

## S-2. Plazos: recordatorio, confirmación y vencimiento (CU-22, CU-04, CU-17)

Lo crítico: que cada acción ocurra **una sola vez** aunque el reloj se atrase o corra dos veces.

```mermaid
sequenceDiagram
    autonumber
    participant R as Reloj
    participant T as Turnos
    participant E as Eventos
    participant N as Notificaciones
    actor C as Cliente
    actor B as Barbero

    Note over R,T: Día anterior, 20:00
    R->>T: procesarPlazos(ahora)
    T->>T: dueActions(turnos activos, ahora)
    T->>T: Marca recordatorio enviado (idempotente)
    T-)E: DayBeforeReminderDue
    E-)N: Recordatorio simple
    N-)C: "Mañana 16:00 · Cancelar"

    Note over R,T: 15:00 (1 h antes)
    R->>T: procesarPlazos(ahora)
    T->>T: requestConfirmation(ahora)
    T-)E: ConfirmationRequested (vence 15:30)
    E-)N: Pedido con acciones
    N-)C: "¿Confirmás 16:00? Confirmar · Cancelar"

    alt el cliente confirma antes de las 15:30
        C->>T: confirmar(turno)
        T->>T: confirm(ahora) → Confirmado
        T-)E: AppointmentConfirmed
        E-)N: Aviso
        N-)B: "Confirmó 16:00"
    else no responde
        Note over R,T: 15:30
        R->>T: procesarPlazos(ahora)
        T->>T: expireConfirmation(ahora) → SinConfirmar
        T-)E: ConfirmationExpired
        E-)N: Pedido de decisión
        N-)B: "16:00 sin confirmar · Mantener · Liberar"
        alt el barbero libera
            B->>T: liberar(turno)
            T->>T: release() → Liberado
            T-)E: AppointmentReleased
            E-)N: Aviso
            N-)C: "Tu turno de 16:00 se liberó"
        else el barbero mantiene
            B->>T: mantener(turno)
            T->>T: keep() → Confirmado
        end
    end
```

**Por qué así:** el reloj no decide nada; solo informa la hora. Las reglas de "qué corresponde ahora"
están en una función pura (`dueActions`) que se prueba con fechas fijas, incluidos los bordes exactos.
Cada turno guarda cuándo se envió su recordatorio y su pedido, así una segunda corrida no repite avisos.

## S-3. Registrar asistencia (CU-18)

Lo crítico: el precio final se calcula **una vez** y queda congelado, y los otros módulos se enteran
sin que Turnos dependa de ellos.

```mermaid
sequenceDiagram
    autonumber
    actor B as Barbero
    participant UI as Interfaz
    participant T as Turnos
    participant P as Precios
    participant K as Conducta
    participant E as Eventos
    participant N as Notificaciones
    actor C as Cliente

    B->>UI: Abre el turno de las 16:00
    UI->>P: liquidación estimada(cliente, fecha, precio base)
    P-->>UI: base $10.000 · −25 % · final $7.500
    B->>UI: Asistió
    UI->>T: marcarAsistencia(turno)
    T->>P: liquidar(cliente, fecha local, precio base)
    P->>P: applicableDiscounts(visitas previas, fecha, reglas) + settle
    P-->>T: liquidación
    T->>T: markAttended(ahora, liquidación) → Asistió
    T->>T: Guardar turno + evento en una sola operación
    T-->>UI: Asistió · cobrar $7.500
    T-)E: AttendanceRegistered
    par Conducta
        E-)K: registerAttendance() → faltas seguidas = 0
    and Precios
        E-)P: Registrar visita computable
        P->>P: benefitProgress(visitas, hoy, reglas)
        opt el próximo corte tiene beneficio
            P-)E: BenefitReached
            E-)N: Aviso
            N-)C: "Tu próximo corte tiene 10 % off"
        end
    end
```

**Variante "Faltó":** en el paso 5 el barbero toca Faltó; no hay liquidación. `AttendanceRegistered`
viaja con `asistió = false`; Conducta suma una falta seguida y, si llega a 3, publica
`NoShowThresholdReached` para avisar al cliente de la política.

## S-4. Turno manual con enlace (CU-15, CU-09)

Lo crítico: que una persona sin cuenta pueda gestionar su turno sin exponer datos de nadie.

```mermaid
sequenceDiagram
    autonumber
    actor B as Barbero
    participant UI as Interfaz
    participant CL as Clientes
    participant T as Turnos
    participant W as WhatsApp
    actor I as Invitado

    B->>UI: Elige 16:00 y busca "Juan"
    UI->>CL: buscar("Juan")
    CL-->>UI: sin resultados
    B->>UI: Carga Juan Pérez · 11 5555-1234
    UI->>CL: crearSinCuenta(nombre, teléfono)
    CL-->>UI: cliente (teléfono normalizado)
    UI->>T: reservarManual(cliente, 16:00)
    T->>T: Mismas reglas que S-1 + genera enlace secreto
    T-->>UI: turno + enlace
    B->>UI: Enviar por WhatsApp
    UI->>W: Abre chat con mensaje ya escrito (día, hora, precio, enlace)
    B->>W: Envía
    W-)I: Mensaje con el enlace

    I->>UI: Abre el enlace
    UI->>T: turnoPorEnlace(token)
    alt enlace válido y turno activo
        T-->>UI: Día, hora, precio, estado (sin teléfono ni historial)
        I->>UI: Confirmar
        UI->>T: confirmarPorEnlace(token)
        T->>T: Mismas reglas que CU-04
        T-->>UI: Confirmado
    else inválido, vencido o terminado
        T-->>UI: Enlace no válido (sin datos)
    end
```

**Por qué así:** el enlace solo da acceso a **ese** turno y a dos acciones. Turnos no sabe qué es
WhatsApp: el mensaje lo arma la interfaz con los datos que devuelve Turnos.
